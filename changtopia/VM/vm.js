/* global  __non_webpack_require__*/
const {Process} = require('./process.js')
const {h, randomHash} = require('../util/hash.js')
const builtins = require('./builtins/builtins.js')
const {NoSuchPidError} = require('../errors.js')
const Pid = require('./pid.js')
const {prettyInst} = require('./instructions/pretty.js')
const {toJsString} = require('../util/strings.js')
const {formatMessage} = require('../util/messages.js')
const process = require('process')


let isMainThread
let postToParent
let workerData
let parentPort

if (!process.browser) {
  __non_webpack_require__ = require // eslint-disable-line no-global-assign
}

if (process.browser) {
  postToParent = (msg) => postMessage(msg)
  isMainThread = false

} else {
  const {
    isMainThread: _isMainThread, parentPort: _parentPort, workerData: _workerData
  } = __non_webpack_require__('worker_threads')
  isMainThread = _isMainThread
  postToParent = (msg) => _parentPort.postMessage(msg)
  parentPort = _parentPort
  workerData = _workerData
}

class Vm {

  constructor(instance, host) {
    this.modules = {bif: builtins}
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
    if (process.browser) {
      onmessage = (e) => this.handleExternalMessage(e.data)
    } else {
      parentPort.on('message', (message) => this.handleExternalMessage(message))
    }
  }

  log(...args) {
    postToParent({internal: 'log', args})
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
      } else if (message.secret === 'spawn') {
        const [pid, module, entryPoint, ...args] = message.payload
        this.spawnProcess(Pid.toPid(pid), toJsString(module), toJsString(entryPoint), args)
        return
      } else {
        throw new Error(`I can't handle the secret: ${message.secret}`)
      }
    }
    this.handleMessage(message)
  }

  dispatchMessage(message) {
    if (message.recipient && message.recipient.instance === this.instance) {
      this.handleMessage(message)
    } else {
      this.sendExternal(message)
    }
    this.processes[Pid.toPid(message.sender)].messagesSent += 1
  }

  handleMessage(message) {
    const recipient = this.processes[Pid.toPid(message.recipient)]
    if (!recipient) {
      this.logError()
      throw new NoSuchPidError(`There is no process ${Pid.toPid(message.recipient)} to read the message ${formatMessage(message)}`)
    }
    recipient.addMessage(message)
  }

  loadModule(module) {
    this.modules[module.moduleName] = module
  }

  spawnProcess(pid, module, entryPoint, args) {
    if (!pid) {
      pid = new Pid(this.instance, randomHash(), this.host)
    }
    const process = new Process(this, pid)
    process.bindFunction(module, entryPoint, 'program_result', args)
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
      throw new Error(`There is no process ${processPid} :O even tho.`)
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
      this.sendExternal({sender: this.instance, internal: 'info', summary: this.getSummary()})
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

}

if (isMainThread) {
  module.exports = {
    Vm
  }
} else {
  if (process.browser) {
    //uuuuuuugh......... fuuuuuk diss
    const whyIsLifeSoHacky = (message) => {
      if (!message || !message.data || message.data.type !== 'init') {
        onmessage = whyIsLifeSoHacky
        return
      }
      const {modules, host, instance} = message.data
      const vm = new Vm(instance, host)
      vm.loadModule(modules)
    }
    onmessage = whyIsLifeSoHacky
  } else {
    const {modules, host, instance} = workerData
    const vm = new Vm(instance, host)
    vm.loadModule(modules)
  }
}