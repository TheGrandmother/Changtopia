const {sizeof} = require('sizeof')
const {Process} = require('./process.js')
const {h, randomHash} = require('../util/hash.js')
const builtins = require('./builtins/builtins.js')
const {NoSuchPidError} = require('../errors.js')
const Pid = require('./pid.js')
const {prettyInst} = require('./instructions/pretty.js')
const {toJsString} = require('../util/strings.js')
const {formatMessage, makeReply} = require('../util/messages.js')
require('setimmediate')
const postToParent = (msg) => postMessage(msg)

class Vm {

  constructor(instance, host, options) {
    this.modules = {core: builtins}
    this.processes = {}
    this.waitingProcesses = []
    this.topQueue = []
    this.bottomQueue = []
    this.skipTop = false
    this.topQuantum = 2000
    this.bottomQuantum = 10000
    this.instance = instance
    this.host = host
    this.chattyThreshold = 5
    this.metricsSampleRate = options.metricsSampleRate
    this.enableMetrics = options.enableMetrics
    this.messagesSent = 0
    onmessage = (e) => this.handleExternalMessage(e.data)
    // setInterval(() => console.log(this.buildDebugInfo()), 10000)

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
      } else {
        throw new Error(`I can't handle the secret: ${message.secret}`)
      }
    }
    this.handleMessage(message)
  }

  dispatchMessage(message, skipCount) {
    this.messagesSent += 1
    if (message.recipient && message.recipient.instance === this.instance) {
      this.handleMessage(message)
    } else {
      this.sendExternal(message)
    }
    if (!skipCount) {
      this.processes[Pid.toPid(message.sender)].messagesSent += 1
    }
  }

  handleMessage(message) {
    const recipient = this.processes[Pid.toPid(message.recipient)]
    if (!recipient) {
      this.logError()
      throw new NoSuchPidError(`There is no process ${Pid.toPid(message.recipient)} to read the message \n${formatMessage(message)} ${this.instance}`)
    }
    recipient.addMessage(message)
  }

  loadModule(module) {
    this.modules[module.moduleName] = module
  }

  spawnProcess(pid, module, entryPoint, args, bindings) {
    if (!pid) {
      pid = new Pid(this.instance, randomHash(), this.host)
    }
    const process = new Process(this, pid)
    process.bindFunction(module, entryPoint, 'program_result', args, bindings)
    this.processes[pid] = process
    this.topQueue.push(pid)
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
      if (process.messagesSent > this.chattyThreshold) {
        this.topQueue.push(processPid)
      } else {
        this.bottomQueue.push(processPid)
      }
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
    return  this.hasQueuedProcesses() || this.waitingProcesses.length !== 0
  }


  start (args, startInIdle = false) {
    if (this.modules.length === 0) {
      throw new Error('No modules loaded... It feels a bit silly to start now')
    }

    if (!startInIdle) {
      this.spawnProcess(undefined, 'main', '_entry', args)
    }

    const runner = () => {
      if (this.waitingProcesses.length !== 0){
        this.processWaitingTasks()
      }
      if (this.hasQueuedProcesses()) {
        this.runProcess()
      }
      if (this.hasProcesses()) {
        setImmediate(() => runner()) // eslint-disable-line
      } else {
        setTimeout(() => runner(), 100) // eslint-disable-line
      }
    }

    runner()
  }

  logError() {
    const stateLegend = '[W,F,A,B,H]'
    function makeStateDisplay(state) {
      const toMark = val => val ? '✓' : ' '
      return Object.values(state).map(toMark).join(',')
    }
    let runningProc = null
    const runningInfo = Object.values(this.processes).map((proc) => {
      const functionId = proc.frame.functionId
      if (!proc.waiting && !proc.finished) {
        runningProc = proc
      }
      const neatString = `${proc.frame.line}: ${prettyInst(proc.getCurrentInstruction())}`
      const state = makeStateDisplay(proc.getStateDescriptor())
      return `${proc.pid}  ${state}  ${functionId}:${neatString}`
    }).join('\n')


    const header = `                             ${stateLegend}`

    this.log(header)
    this.log(runningInfo)
    if (runningProc) {
      this.log(runningProc.stack.getStackTrace())
    }
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
