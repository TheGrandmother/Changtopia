const {Process} = require('./process.js')
const {h, randomHash} = require('../util/hash.js')
const builtins = require('./builtins/builtins.js')
const {NoSuchPidError} = require('../errors.js')
const Pid = require('./pid.js')
const {prettyInst} = require('./instructions/pretty.js')
const {inspect} = require('util')
const {toJsString} = require('../util/strings.js')

const {
  isMainThread, parentPort, workerData
} = require('worker_threads')

class Vm {

  constructor(instance, host) {
    this.modules = {bif: builtins}
    this.processes = {}
    this.runningProcesses = []
    this.waitingProcesses = []
    this.quantum = 25000
    this.openWindow = 1
    this.instanceId = instance
    this.host = host
    parentPort.on('message', (message) => this.handleExternalMessage(message))
  }

  log(...args) {
    parentPort.postMessage({internal: true, args})
  }

  pidExists(pid) {
    return !!this.processes[pid]
  }

  sendExternal(message) {
    parentPort.postMessage(message)
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
    if (message.recipient.instance === this.instanceId) {
      this.handleMessage(message)
    } else {
      this.sendExternal(message)
    }
  }

  handleMessage(message) {
    const recipient = this.processes[Pid.toPid(message.recipient)]
    if (!recipient) {
      this.log(Object.keys(this.processes))
      this.logError()
      throw new NoSuchPidError(`There is no process ${Pid.toPid(message.recipient)} to read the message ${inspect(message)}`)
    }
    recipient.addMessage(message)
  }

  loadModule(module) {
    this.modules[module.moduleName] = module
  }

  spawnProcess(pid, module, entryPoint, args) {
    if (!pid) {
      pid = new Pid(this.instanceId, randomHash(), this.host)
    }
    const process = new Process(this, pid)
    process.bindFunction(module, entryPoint, 'program_result', args)
    this.processes[pid] = process
    this.runningProcesses.push(pid)
    return pid
  }

  runProcess() {
    const processPid = this.runningProcesses[0]
    this.runningProcesses = this.runningProcesses.slice(1)
    const process = this.processes[processPid]
    for (let i = 0; i < this.quantum && !process.finished && !process.waiting; i++) {
      process.executeInstruction()
    }
    if (!process.finished && !process.waiting) {
      this.runningProcesses.push(processPid)
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
        this.runningProcesses.push(process.pid)
      } else {
        newWaiting.push(process.pid)
      }
    }
    this.waitingProcesses = newWaiting
  }

  start (args, startInIdle = false) {
    if (this.modules.length === 0) {
      throw new Error('No modules loaded... It feels a bit silly to start now')
    }

    if (!startInIdle) {
      this.spawnProcess(undefined, 'main', '_entry', args)
    }

    let countSinceLastOpen = 0

    const runner = () => {
      while ((this.runningProcesses.length !== 0 || this.waitingProcesses.length !== 0) && countSinceLastOpen < this.openWindow) {
        if (this.waitingProcesses.length !== 0){
          this.processWaitingTasks()
        }
        if (this.runningProcesses.length !== 0) {
          this.runProcess()
        }
        countSinceLastOpen += 1
      }
      countSinceLastOpen = 0
      setImmediate(() => runner()) // eslint-disable-line
    }

    runner()
  }

  logError() {
    const stateLegend = '[W,F,A,B,H]'
    function makeStateDisplay(state) {
      const toMark = val => val ? '✓' : ' '
      return Object.values(state).map(toMark).join(',')
    }
    const runningInfo = this.runningProcesses.map((pid) => {
      const proc = this.processes[pid]
      const functionId = proc.frame.functionId
      const neatString = `${proc.frame.line}: ${prettyInst(proc.getCurrentInstruction())}`
      const state = makeStateDisplay(proc.getStateDescriptor())
      return `${pid}\t${state}\t${functionId}:${neatString}`
    })

    const waitingInfo = this.waitingProcesses.map((pid) => {
      const proc = this.processes[pid]
      const functionId = proc.frame.functionId
      const neatString = `${proc.frame.line}: ${prettyInst(proc.getCurrentInstruction())}`
      const state = makeStateDisplay(proc.getStateDescriptor())
      return `${pid}\t${state}\t${functionId}:${neatString}`
    })
    this.log(runningInfo)
  }

}

if (isMainThread) {
  module.exports = {
    Vm
  }
} else {
  const {modules, host, instance} = workerData
  const vm = new Vm(instance, host)
  vm.loadModule(modules)
}
