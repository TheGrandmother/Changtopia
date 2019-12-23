const {Process} = require('./process.js')
const {builtins} = require('./builtins/builtins.js')
const {NoSuchPidError, NameSpaceError} = require('./errors.js')


const {
  isMainThread, parentPort, workerData
} = require('worker_threads')



class Vm {

  constructor() {
    this.functions = builtins
    this.processes = {}
    this.pidCounter = 0
    this.runningProcesses = []
    this.waitingProcesses = []
    this.quantum = 5
    this.openWindow = 1000
    parentPort.on('message', (message) => this.handleExternalMessage(message))
  }

  pidExists(pid) {
    return !!this.processes[pid]
  }

  sendExternal(message) {
    parentPort.postMessage(message)
  }

  handleExternalMessage(message) {
    this.dispatchMessage(message)
  }

  dispatchMessage(message) {
    if (message.recipient === 0) {
      this.sendExternal(message)
      return
    }
    const recipient = this.processes[message.recipient]
    if (!recipient) {
      throw new NoSuchPidError(`There is no process ${message.recipient} to read this message`)
    }
    recipient.addMessage(message)
  }

  loadFunctions(funcs) {
    if (Object.values(funcs).some(({functionId}) => Object.keys(this.functions).includes(functionId))) {
      throw new NameSpaceError('Could not load functions there were collisions')
    }
    this.functions = this.functions.concat(funcs)
  }

  spawnProcess(entryPoint, args) {
    this.pidCounter += 1
    const pid = this.pidCounter
    const process = new Process(this, pid)
    this.functions.forEach((func) => process.addFunction(func))
    process.bindFunction(entryPoint,'program_result', args)
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
      process.cleanup()
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

  start (entryFunction, args) {
    if (this.functions.length === 0) {
      throw new Error('No functions loaded... It feels a bit silly to start now')
    }
    this.spawnProcess('_entry', args)

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
        setImmediate(() => {runner() && process.exit(0)}) // eslint-disable-line
        return false
      } else {
        console.log('Seriously, how the fuck can this not be exit?')
        return true
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
  const functions = workerData
  const vm = new Vm()
  vm.loadFunctions(functions)
  vm.start('_entry', [])
}
