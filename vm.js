const {
  isMainThread, parentPort, workerData
} = require('worker_threads')

const {Process} = require('./process.js')

const hwFunctions = [
  {
    functionId: '_log',
    hwFunction: true,
    exec: (process, _, ...args) => {
      console.log(`DBG: ${process.pid}/${process.getCurrentFunctionId()}:\t ${args.join(' ')}`)
    }
  },
  {
    functionId: 'send',
    hwFunction: true,
    exec: (process, _, recipient, ...payload) => {
      process.sendMessage({recipient, payload})
    }
  },
  {
    functionId: 'request',
    hwFunction: true,
    exec: (process, responseLocation, recipient, ...payload) => {
      process.sendMessage({recipient, payload}, responseLocation)
    }
  },
  {
    functionId: 'pid',
    hwFunction: true,
    exec: (process) => {
      return process.pid
    }
  },
  {
    functionId: 'listen',
    hwFunction: true,
    exec: (process, returnLocation, functionId, ...args) => {
      process.await(functionId, returnLocation, args)
      return 0
    }
  },
  {
    functionId: 'spawn',
    hwFunction: true,
    exec: (process, returnLocation, functionId, ...args) => {
      const _args = []
      args.forEach(a => _args.push(process.frame.data[a]))
      return process.vm.spawnProcess(functionId, _args)
    }
  }
]

class Vm {

  constructor() {
    this.functions = hwFunctions
    this.processes = {}
    this.pidCounter = 0
    this.taskQueue = []
    this.waitingTasks = []
    this.quantum = 5
    this.openWindow = 1000
    parentPort.on('message', (message) => this.handleExternalMessage(message))
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
      throw new Error(`There is no process ${message.recipient} to read this message`)
    }
    recipient.inbox.push(message)
  }

  loadFunctions(funcs) {
    if (Object.values(funcs).some(({functionId}) => Object.keys(this.functions).includes(functionId))) {
      throw new Error('Could not load functions there were collisions')
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
    this.taskQueue.push(pid)
    return pid
  }

  runHead() {
    const pid = this.taskQueue[0]
    this.taskQueue = this.taskQueue.slice(1)
    const process = this.processes[pid]
    for (let i = 0; i < this.quantum && !process.finished && !process.waiting; i++) {
      process.executeInstruction()
    }
    if (!process.finished && !process.waiting) {
      this.taskQueue.push(pid)
    } else if (process.waiting) {
      this.waitingTasks.push(pid)
    } else if (process.finished) {
      process.cleanup()
      delete this.processes[pid]
    }
  }

  processWaitingTasks() {
    const newWaiting = []
    for (let i = 0; i < this.waitingTasks.length; i++) {
      const process = this.processes[this.waitingTasks[i]]
      const released = process.checkInbox()
      if (released) {
        this.taskQueue.push(process.pid)
      } else {
        newWaiting.push(process.pid)
      }
    }
    this.waitingTasks = newWaiting
  }

  start (entryFunction, args) {
    if (this.functions.length === 0) {
      throw new Error('No functions loaded... It feels a bit silly to start now')
    }
    this.spawnProcess('_entry', args)

    let countSinceLastOpen = 0

    const runner = () => {
      while ((this.taskQueue.length !== 0 || this.waitingTasks.length !== 0) && countSinceLastOpen < this.openWindow) {
        if (this.waitingTasks.length !== 0){
          this.processWaitingTasks()
        }
        if (this.taskQueue.length !== 0) {
          this.runHead()
        }
        countSinceLastOpen += 1
      }
      if(this.taskQueue.length !== 0 || this.waitingTasks.length !== 0){
        countSinceLastOpen = 0
        setImmediate(() => {runner() && process.exit(1)})
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
