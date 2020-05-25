const fs = require('fs').promises
const os = require('os')
const process = require('process')
const ansiEscapes = require('ansi-escapes')
const ansiStyles = require('ansi-styles')

const {Worker} = require('worker_threads')
const {NodeIoHandler} = require('./Io/NodeIO.js')
const {randomHash} = require('./util/hash.js')
const Pid = require('./VM/pid.js')

class Coordinator {
  constructor(instanceCount, modules, ioHandler) {
    this.host = randomHash()
    this.instanceCount = instanceCount
    this.modules = modules
    this.ioHandler = ioHandler
    this.workers = {}
    this.showStats = false
  }

  findAvaliableInstance() {
    const arr = Object.values(this.workers)
    let best = arr[0]

    for (let i = 1; i < arr.length; i ++) {
      const candidate = arr[i]
      best = candidate.load < best.load ? candidate : best
    }

    return best
  }

  spawnProcess(worker, message) {
    const assignedWorker = this.findAvaliableInstance()
    assignedWorker.load += 1
    const pid = new Pid(assignedWorker.instance, randomHash(), assignedWorker.host)
    assignedWorker.postMessage({payload: [pid, ...message.payload], secret: 'spawn'})
    if (message.requiresResponse) {
      return worker.postMessage({recipient: message.sender, id: randomHash(), payload: pid, requestId: message.id})
    }
  }

  debugStatus () {
    const statusString = ansiEscapes.cursorSavePosition + ansiEscapes.cursorTo(0,0) + ansiEscapes.eraseLine + ansiStyles.color.close
    const summaries = Object.keys(this.workers).map(instance => {
      const {topQueue, bottomQueue, waiting} = this.workers[instance].stats
      return `|I:${parseInt(instance).toString(16)}\tT:${topQueue}\tB:${bottomQueue}\tW:${waiting}|`
    }).join('\t')
    //process.stdout.write(`${statusString}` + summaries + ansiEscapes.cursorRestorePosition)
    fs.writeFile('.monitor', `${statusString}` + summaries +'\n' +`THERE ARE: ${process._getActiveHandles().length} HANDLES AND ${process._getActiveRequests().length} requests` + ansiEscapes.cursorRestorePosition, {flag: 'a+'})
  }

  start() {
    for (let i = 0; i < this.instanceCount; i = i + 1) {
      this.spawnVm()
    }
    this.launchVms()
  }

  launchVms() {
    let startInIdle = false
    Object.values(this.workers).forEach(worker => {
      worker.postMessage({payload: {startInIdle}, secret: 'start'})
      startInIdle = true
    })
  }

  updateInfo(sender, summary) {
    this.workers[sender].stats = summary
    if (this.showStats) {
      this.showStats = false
      setTimeout(() => {this.debugStatus(); this.showStats = true}, 50)
    }
    this.workers[sender].load = summary.topQueue + summary.bottomQueue
  }

  handleMessage(worker, message) {
    const {internal, recipient, sender} = message
    if (internal) {
      if (internal === 'log') {
        console.log(...message.args)
      }
      if (internal === 'spawn') {
        this.spawnProcess(worker, message)
      }
      if (internal === 'info') {
        this.updateInfo(sender, message.summary)
      }
    } else {
      if (Pid.toPid(recipient).isIo()) {
        this.ioHandler.handleMessage(worker, message)
      } else {
        const instance = recipient.instance
        if (!this.workers[instance]) {
          worker.postMessage({payload: instance, secret: 'no_instance'})
          return
        }
        this.workers[instance].postMessage(message)
      }
    }
  }

  spawnVm() {
    const instance = randomHash()
    const worker = new Worker('./VM/vm.js', {workerData: {modules: this.modules, host: this.host, instance}})
    worker.instance = instance
    worker.host = this.host
    worker.workers = this.workers
    worker.load = 0
    worker.stats = {topQueue: 0, bottomQueue: 0}
    this.workers[instance] = worker
    console.log(`Instance ${instance.toString(16)} started`)
    worker.on('error', (err) => {
      console.log()
      throw err
    })
    worker.on('message', (message) => {
      this.handleMessage(worker, message)
    })
  }
}

async function main () {
  console.log('Launching VM')
  const [,, inFile] = process.argv
  const modules = JSON.parse((await fs.readFile(inFile)).toString())

  const cpuCount = os.cpus().length

  const coordinator = new Coordinator(cpuCount, modules, new NodeIoHandler)
  coordinator.start()
}

main().then().catch((err) => {console.log('Uncaucght fuckup'); console.error(err); process.exit(420)})
