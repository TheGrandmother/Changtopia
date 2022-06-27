const {randomHash} = require('./util/hash.js')
const Pid = require('./VM/pid.js')

let ws
let Worker

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

class Coordinator {
  constructor(instanceCount, modules, ioHandler, mediatorHost) {
    this.host = randomHash()
    this.instanceCount = instanceCount
    this.modules = modules
    this.ioHandler = ioHandler
    this.workers = {}
    this.showStats = false
    this.debugInfo = {}
    this.metrics = {
      instructions: {
        totalTime: 0,
        totalInstructions: 0,
        breakdown: {}
      },
      io: {
        totalTime: 0,
        totalMessages: 0,
        breakdown: {}
      },
      core: {
        totalTime: 0,
        totalCalls: 0,
        breakdown: {}
      },
      calls: {
        totalTime: 0,
        totalCalls: 0,
        breakdown: {}
      }
    }

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
    // setInterval(() => console.log(Object.values(this.workers).map(w => w.load)), 100)
    this.nextProccessTo = 0
  }

  findAvaliableInstance() {
    const arr = Object.values(this.workers)
    const scheduleTo = arr[this.nextProccessTo]
    this.nextProccessTo = this.nextProccessTo === arr.length - 1 ? 0 : this.nextProccessTo + 1
    return scheduleTo
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

  handleMetrics(sender, type, data) {
    if (type === 'instructions') {
      Object.values(data).forEach((e) => {
        this.metrics.instructions.totalTime += e.time
        this.metrics.instructions.totalInstructions += e.calls
      })
      this.metrics.instructions.avgTime = this.metrics.instructions.totalTime / this.metrics.instructions.totalInstructions
      this.metrics.instructions.ops = Math.floor(1/this.metrics.instructions.avgTime) + 'kI/s'
      Object.keys(data).forEach((id) => {
        const payload = data[id]
        const current = {
          calls: 0,
          time: 0,
          ...this.metrics.instructions.breakdown[id]
        }
        this.metrics.instructions.breakdown[id] = {
          calls: current.calls + payload.calls,
          time: Math.floor(current.time + payload.time),
          'avg(ms)': ((current.time + payload.time) / (current.calls + payload.calls))*1000
        }
      })
    }
    if (type === 'io') {
      Object.values(data).forEach((e) => {
        this.metrics.io.totalTime += e.time
        this.metrics.io.totalMessages += e.calls
      })
      Object.keys(data).forEach((id) => {
        const payload = data[id]
        const current = {
          calls: 0,
          time: 0,
          ...this.metrics.io.breakdown[id]
        }
        this.metrics.io.breakdown[id] = {
          calls: current.calls + payload.calls,
          time: current.time + payload.time
        }
      })
    }
    if (type === 'core') {
      Object.values(data).forEach((e) => {
        this.metrics.core.totalTime += e.time
        this.metrics.core.totalCalls += e.calls
      })
      Object.keys(data).forEach((id) => {
        const payload = data[id]
        const current = {
          calls: 0,
          time: 0,
          ...this.metrics.core.breakdown[id]
        }
        this.metrics.core.breakdown[id] = {
          calls: current.calls + payload.calls,
          time: current.time + payload.time
        }
      })
    }
    if (type === 'calls') {
      Object.values(data).forEach((e) => {
        this.metrics.calls.totalTime += Math.floor(e.time)
        this.metrics.calls.totalCalls += e.calls
      })
      Object.keys(data).forEach((id) => {
        const payload = data[id]
        const current = {
          calls: 0,
          time: 0,
          ...this.metrics.calls.breakdown[id]
        }
        this.metrics.calls.breakdown[id] = {
          calls: current.calls + payload.calls,
          time: Math.floor(current.time + payload.time)
        }
      })
    }
    console.log(this.metrics)
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
      if (internal === 'metrics') {
        const [type, data] = message.args
        this.handleMetrics(sender, type, data)
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
    const options = {
      enableMetrics: JSON.parse(localStorage['DEBUG_METRICS_ENABLE'] || 'false'),
      metricsSampleRate: JSON.parse(localStorage['DEBUG_METRICS_SAMPLE_RATE'] || '1'),
    }
    const worker = new Worker('vm.js', {workerData: {modules: this.modules, host: this.host, instance, options}})
    worker.instance = instance
    worker.host = this.host
    worker.workers = this.workers
    worker.load = 0
    worker.stats = {topQueue: 0, bottomQueue: 0}
    this.workers[instance] = worker
    worker.on('error', (err) => {
      throw err
    })
    worker.on('message', (message) => {
      this.handleMessage(worker, message)
    })
  }
}

function crazyCoolStarter(initModules, term, mediatorHost) {
  const cpuCount =  JSON.parse(localStorage['DEBUG_OVERRIDE_CPU_COUNT'] || 'false') || window.navigator.hardwareConcurrency
  const {BrowserIO} = require('./Io/BrowserIO.js')
  const browserIO = new BrowserIO(term)
  window.coordinator = new Coordinator(cpuCount, initModules, browserIO, mediatorHost)
  browserIO.coordinator = window.coordinator

  return browserIO
}

module.exports = {crazyCoolStarter}
