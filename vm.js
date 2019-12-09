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
  }

  dispatchMessage(message) {
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

    while (this.taskQueue.length !== 0 || this.waitingTasks.length !== 0) {
      if (this.waitingTasks.length !== 0){
        this.processWaitingTasks()
      }
      if (this.taskQueue.length !== 0) {
        this.runHead()
      }
    }

  }

}

module.exports = {
  Vm
}
