const {Process} = require('./process.js')
const {h, randomHash} = require('../util/hash.js')
const builtins = require('./builtins/builtins.js')
const {NoSuchPidError} = require('../errors.js')
const Pid = require('./pid.js')

const {
  isMainThread, parentPort, workerData
} = require('worker_threads')

class Vm {

  constructor() {
    this.modules = {bif: builtins}
    this.processes = {}
    this.runningProcesses = []
    this.waitingProcesses = []
    this.quantum = 5
    this.openWindow = 1000
    this.instanceId = randomHash()
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
        this.loadModule(message.payload)
        message.payload = h('module_loaded')
      }
    }
    this.dispatchMessage(message)
  }

  dispatchMessage(message) {
    message.recipient = Pid.toPid(message.recipient)
    if (message.recipient.isIo()) {
      this.sendExternal(message)
      return
    }
    const recipient = this.processes[message.recipient]
    if (!recipient) {
      throw new NoSuchPidError(`There is no process ${message.recipient} to read this message`)
    }
    recipient.addMessage(message)
  }

  loadModule(module) {
    this.modules[module.moduleName] = module
  }

  spawnProcess(module, entryPoint, args) {
    const pid = new Pid(this.instanceId)
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

  start (args) {
    if (this.modules.length === 0) {
      throw new Error('No modules loaded... It feels a bit silly to start now')
    }
    this.spawnProcess('main', '_entry', args)

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
      if(this.runningProcesses.length !== 0 || this.waitingProcesses.length !== 0){
        countSinceLastOpen = 0
        setImmediate(() => runner()) // eslint-disable-line
      } else {
        process.exit(0) // eslint-disable-line
      }
    }

    runner()

  }

}

if (isMainThread) {
  module.exports = {
    Vm
  }
} else {
  const modules = workerData
  const vm = new Vm()
  vm.loadModule(modules)
  vm.start([])
}
