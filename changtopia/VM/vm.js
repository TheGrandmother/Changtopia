const {sizeof} = require('sizeof')
const {Process} = require('./process.js')
const {h, randomHash} = require('../util/hash.js')
const builtins = require('./builtins/builtins.js')
const Pid = require('./pid.js')
const {prettyInst} = require('./instructions/pretty.js')
const {toJsString, fromJsString} = require('../util/strings.js')
const {makeReply} = require('../util/messages.js')
const postToParent = (msg) => postMessage(msg)

class Vm {

  constructor(instance, host, options) {
    this.modules = {core: builtins}
    this.processes = {}
    this.waitingProcesses = []
    this.topQueue = []
    this.bottomQueue = []
    this.skipTop = false
    this.topQuantum = 1000
    this.bottomQuantum = 75000
    this.instance = instance
    this.host = host
    this.metricsSampleRate = options.metricsSampleRate
    this.enableMetrics = options.enableMetrics
    this.messagesSent = 0
    this.internalChannel = new MessageChannel()
    onmessage = (e) => this.handleExternalMessage(e.data)
    this.internalChannel.port1.onmessage = () => {
      this.runner()
    }
  }

  sceduleExecution() {
    this.internalChannel.port2.postMessage(0)
  }

  buildDebugInfo() {
    const processes = Object.values(this.processes)
    const processCount = processes.length
    const waitingCount = this.waitingProcesses.length
    const processesInfo = processes.map(p => ({
      inboxLength: p.inbox.length,
      inboxSize: p.inbox.map(m => sizeof(m)).reduce((a,b) => a + b, 0),
      functions: p.stack.frames.map(f => `${f.func.moduleName}:${f.func.functionId}`),
      frameSizes: p.stack.frames.map(f => sizeof(f.data)),
      totalSize: p.stack.frames.map(f => sizeof(f.data)).reduce((a,b) => a+b, 0),
      frameCount: p.stack.frames.length
    }))
    const totalMem = processesInfo.map(i => i.totalSize).reduce((a,b) => a+b, 0)
    const totalInboxSize = processesInfo.map(i => i.inboxSize).reduce((a,b) => a+b, 0)
    const totalInboxLength = processesInfo.map(i => i.inboxLength).reduce((a,b) => a+b, 0)
    return {
      totalMem,
      totalInboxSize,
      totalInboxLength,
      processCount,
      waitingCount,
      processesInfo,
      messagesSent: this.messagesSent
    }
  }

  log(...args) {
    postToParent({internal: 'log', args})
  }

  postMetrics(...args) {
    postToParent({internal: 'metrics', args})
  }

  pidExists(pid) {
    return !!this.processes[pid]
  }

  sendExternal(message) {
    postToParent(message)
  }

  handleExternalMessage(message) {
    if (message.secret) {
      if (message.secret === 'module') {
        const {module, sneaky} = message.payload
        this.loadModule(module)
        if (sneaky) {
          return
        }
        message.payload = h('module_loaded')
      } else if (message.secret === 'start') {
        const {startInIdle} = message.payload
        this.start([], startInIdle)
        return
      } else if (message.secret === 'has_module') {
        const {moduleName} = message.payload
        this.dispatchMessage(makeReply(message, !!this.modules[moduleName]), true)
        return
      } else if (message.secret === 'dump') {
        if (Object.keys(this.processes).length !== 0) {
          console.log(this)
        }
        return
      } else if (message.secret === 'spawn') {
        const [pid, module, entryPoint, bindings, ...args] = message.payload
        this.spawnProcess(Pid.toPid(pid), toJsString(module), toJsString(entryPoint), args, bindings)
        return
      } else if (message.secret === 'kill') {
        const [pid] = message.payload
        console.log('Killing ', pid, ' by force')
        this.killProcess(pid)
        return
      } else {
        throw new Error(`I can't handle the secret: ${message.secret}`)
      }
    }
    this.handleMessage(message)
  }

  dispatchMessage(message, skipCount) {
    this.messagesSent += 1
    this.sendExternal(message)
    if (!skipCount) {
      // The sender might have died
      if (this.processes[Pid.toPid(message.sender)]) {
        this.processes[Pid.toPid(message.sender)].messagesSent += 1
      }
    }
  }

  handleMessage(message) {
    const recipient = this.processes[Pid.toPid(message.recipient)]
    if (!recipient) {
      console.log(`${message.recipient.id} has died and cant come to the queue`)
      if (message.payload[0] === h('error')) {
        // It is incredibly likely that both processes are dead in this case
        return
      }
      this.dispatchMessage(makeReply(message, [h('error'), h('no_recipient'), fromJsString(`There is no process ${Pid.toPid(message.recipient)} to read the message on ${this.instance}`), []]))
    } else {
      recipient.addMessage(message)
      this.sceduleExecution()
    }
  }

  loadModule(module) {
    this.modules[module.moduleName] = module
  }

  killProcess(pid) {
    if (this.processes[pid]) {
      delete this.processes[pid]
      this.topQueue = this.topQueue.filter((p) => p != pid)
      this.bottomQueue = this.bottomQueue.filter((p) => p != pid)
      this.waitingProcesses = this.waitingProcesses.filter((p) => p != pid)
    }
  }

  spawnProcess(pid, module, entryPoint, args, bindings) {
    if (!pid) {
      pid = new Pid(this.instance, randomHash(), this.host)
    }
    const process = new Process(this, pid)
    process.bindFunction(module, entryPoint, 'program_result', args, bindings)
    this.processes[pid] = process
    this.topQueue.push(pid)
    this.sceduleExecution()
    return pid
  }

  fetchPidToExecute() {
    let processPid = this.topQueue[0]
    if (!processPid || (this.skipTop && this.bottomQueue.length !== 0)) {
      processPid = this.bottomQueue.shift()
      this.skipTop = false
      this.wePickedTop = false
      return {processPid, quantum: this.bottomQuantum}
    }
    this.topQueue = this.topQueue.slice(1)
    this.wePickedTop = true
    if (this.topQueue.length === 0) {
      this.skipTop = true
    }
    return {processPid, quantum: this.topQuantum}
  }

  runProcess() {
    const {processPid, quantum} = this.fetchPidToExecute()
    const process = this.processes[processPid]
    if (!process) {
      throw new Error(`There is no process ${processPid} :O`)
    }
    process.messagesSent = 0
    for (let i = 0; i < quantum && !process.finished && !process.waiting; i++) {
      process.executeInstruction()
    }
    if (!process.finished && !process.waiting) {
      this.bottomQueue.push(processPid)
    } else if (process.waiting) {
      this.waitingProcesses.push(processPid)
    } else if (process.finished) {
      delete this.processes[processPid]
    }
  }

  processWaitingTasks() {
    const newWaiting = []
    for (let i = 0; i < this.waitingProcesses.length; i++) {
      const process = this.processes[this.waitingProcesses[i]]
      process.checkInbox()
      if (!process.waiting) {
        this.topQueue.push(process.pid)
      } else {
        newWaiting.push(process.pid)
      }
    }
    this.waitingProcesses = newWaiting
  }

  hasQueuedProcesses() {
    return this.topQueue.length !== 0 || this.bottomQueue.length !== 0
  }

  hasProcesses() {
    return this.hasQueuedProcesses() || this.waitingProcesses.length !== 0
  }

  hasMessages() {
    return Object.values(this.processes).some(p => p.inbox.length !== 0)
  }


  start (args, startInIdle = false) {
    if (this.modules.length === 0) {
      throw new Error('No modules loaded... It feels a bit silly to start now')
    }

    if (!startInIdle) {
      this.spawnProcess(undefined, 'main', '_entry', args)
    }

    this.internalChannel.port2.postMessage(0)
  }

  runner() {
    if (this.waitingProcesses.length !== 0){
      this.processWaitingTasks()
    }
    if (this.hasQueuedProcesses()) {
      this.runProcess()
    }
    if (this.hasQueuedProcesses()) {
      // We still have queued processes run asap
      this.sceduleExecution()
    }

    if (this.hasMessages()) {
      // Some kids might still have stuff in their inboxes
      this.sceduleExecution()
    }
  }

  logError() {
    if (Object.values(this.processes).length == 0) {
      return
    }
    const stateLegend = '[W,F,A,B,H]'
    function makeStateDisplay(state) {
      const toMark = val => val ? '✓' : ' '
      return Object.values(state).map(toMark).join(',')
    }
    let runningProc = null
    const runningInfo = Object.values(this.processes).map((proc) => {
      const functionId = proc.frame.functionId
      const module = proc.frame.func.moduleName
      if (!proc.waiting && !proc.finished) {
        runningProc = proc
      }
      const neatString = `${proc.frame.line}: ${prettyInst(proc.getCurrentInstruction())}`
      const state = makeStateDisplay(proc.getStateDescriptor())
      return `${proc.pid}  ${state}  ${module}:${functionId}:${neatString}`
    }).join('\n')


    let errorString = ''
    errorString += `                             ${stateLegend}` + '\n'
    errorString += runningInfo + '\n'
    if (runningProc) {
      errorString += runningProc.stack.getStackTrace()
    }
    this.log(errorString)
  }

  getSummary() {
    return {topQueue: this.topQueue.length, bottomQueue: this.bottomQueue.length, waiting: this.waitingProcesses.length}
  }

  getModule(name) {
    return this.modules[name]
  }

}

// So to make a comment litterally a year later... If this is a remnant from times passed.
// Why the fokk is it still here...
// This is a remnant from when shit was both node and browser compatible
const whyIsLifeSoHacky = (message) => {
  if (!message || !message.data || message.data.type !== 'init') {
    onmessage = whyIsLifeSoHacky
    return
  }
  const {modules, host, instance, options} = message.data
  const vm = new Vm(instance, host, options)
  vm.loadModule(modules)
}
onmessage = whyIsLifeSoHacky
