/* global  __non_webpack_require__*/

const os = require('os')
const process = require('process')
const ansiEscapes = require('ansi-escapes')
const ansiStyles = require('ansi-styles')
const {randomHash} = require('./util/hash.js')
const Pid = require('./VM/pid.js')
const config = require('../config.json')

let ws
let Worker
let argv

if (!process.browser) {
  __non_webpack_require__ = require // eslint-disable-line no-global-assign
}

if (process.browser) {
  Worker = class extends window.Worker{
    constructor(url, thing) {
      super(url)
      this.postMessage({type: 'init', ...thing.workerData})
    }

    on(type, handler) {
      if (type === 'message') {
        this.onmessage = (e) => handler(e.data)
      }
      if (type === 'error') {
        this.onerror = handler
      }
    }
  }

  ws = class extends WebSocket{

    on(type, handler) {
      this.addEventListener(type, (e) => {
        handler(e.data)
      })
    }

    once(type, handler) {
      this.addEventListener(type, (e) => {
        handler(e.data)
      }, {once: true})
    }
  }

} else {
  Worker = __non_webpack_require__('worker_threads').Worker
  argv = __non_webpack_require__('yargs')
    .option('no-mediator', {alias: 'r', description: 'Don\'t connect to remote instances', type:'boolean', default: false})
    .option('mediator-host', {alias: 'h', description: 'Hostname of remote mediator', type:'string', default: config.mediator_host})
    .argv
  ws = require('ws')
}

class Coordinator {
  constructor(instanceCount, modules, ioHandler, mediatorHost) {
    this.host = randomHash()
    this.instanceCount = instanceCount
    this.modules = modules
    this.ioHandler = ioHandler
    this.workers = {}
    this.showStats = false

    this.pendingRemoteMessages = {}
    this.ws = new ws(mediatorHost)
    this.ws.on('open', () => {
      this.ws.on('close', () => {
        console.log('For some strange fucking reason we were closed.')
      })
      this.ws.once('message', (_message) => {
        const message = JSON.parse(_message)
        if (message.type === 'registered') {
          console.log('Successfully registered with remote mediator')
          this.ws.on('message', (message) => this.handleRemoteMessage(message))
          this.start()
        }
      })
      this.ws.send(JSON.stringify({type: 'register', host: this.host}))
    })
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
    //const statusString = ansiEscapes.cursorSavePosition + ansiEscapes.cursorTo(0,0) + ansiEscapes.eraseLine + ansiStyles.color.close
    //const summaries = Object.keys(this.workers).map(instance => {
    //  const {topQueue, bottomQueue, waiting} = this.workers[instance].stats
    //  return `|I:${parseInt(instance).toString(16)}\tT:${topQueue}\tB:${bottomQueue}\tW:${waiting}|`
    //}).join('\t')
    //process.stdout.write(`${statusString}` + summaries + ansiEscapes.cursorRestorePosition)
    //fs.writeFile('.monitor', `${statusString}` + summaries +'\n' +`THERE ARE: ${process._getActiveHandles().length} HANDLES AND ${process._getActiveRequests().length} requests` + ansiEscapes.cursorRestorePosition, {flag: 'a+'})
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

  handleRemoteMessage(_message) {
    const message = JSON.parse(_message)
    if (message.recipient.host !== this.host) {
      throw new Error(`Ehm.... I got a message that should go to ${message.recipient.host.toString(16)} but I fucking am ${this.host}`)
    }
    this.handleMessage(this.workers[message.recipient.instance], message)
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
      if (recipient.host !== this.host) {
        this.ws.send(JSON.stringify(message))
      } else if (Pid.toPid(recipient).isIo()) {
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
    const worker = new Worker(process.browser ? 'vm.js' : './VM/vm.js', {workerData: {modules: this.modules, host: this.host, instance}})
    worker.instance = instance
    worker.host = this.host
    worker.workers = this.workers
    worker.load = 0
    worker.stats = {topQueue: 0, bottomQueue: 0}
    this.workers[instance] = worker
    console.log(`Instance ${instance.toString(16)} started`)
    worker.on('error', (err) => {
      throw err
    })
    worker.on('message', (message) => {
      this.handleMessage(worker, message)
    })
  }
}

async function main () {
  const fs = __non_webpack_require__('fs').promises
  console.log('Launching VM')
  const [,, inFile] = process.argv
  const modules = JSON.parse((await fs.readFile(inFile)).toString())

  const cpuCount = os.cpus().length

  const {NodeIoHandler} = __non_webpack_require__('./Io/NodeIO.js')
  new Coordinator(cpuCount, modules, new NodeIoHandler(), argv['mediator-host'])
}

function crazyCoolStarter(initModules, term, mediatorHost) {
  const cpuCount = window.navigator.hardwareConcurrency
  const {BrowserIO} = require('./Io/BrowserIO.js')
  const browserIO = new BrowserIO(term)
  new Coordinator(cpuCount, initModules, browserIO, mediatorHost)
  return browserIO
}

if (process.browser) {
  module.exports = {crazyCoolStarter}
} else {
  main().then().catch((err) => {console.log('Uncaucght fuckup'); console.error(err); process.exit(420)})
}
