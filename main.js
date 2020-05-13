const fs = require('fs').promises
const os = require('os')
const process = require('process')

const {Worker} = require('worker_threads')
const {NodeIoHandler} = require('./Io/NodeIO.js')
const {randomHash} = require('./util/hash.js')
const Pid = require('./VM/pid.js')

const ioHandler = new NodeIoHandler()
const workers = {}

function spawnVms(modules, threads) {
  const host = randomHash()
  function launchWorker() {
    const instance = randomHash()
    const worker = new Worker('./VM/vm.js', {workerData: {modules, host, instance}})
    worker.instance = instance
    worker.host = host
    worker.workers = workers
    workers[instance] = worker
    console.log('VM spawned')
    worker.on('error', (err) => {throw err})
    worker.on('message', (message) => {
      const {internal, args} = message
      if (internal) {
        console.log(...args)
      } else {
        if (Pid.toPid(message.recipient).isIo()) {
          ioHandler.handleMessage(worker, message)
        } else {
          const instance = message.recipient.instance
          if (!workers[instance]) {
            worker.postMessage({payload: instance, secret: 'no_instance'})
            return
          }
          workers[instance].postMessage(message)
        }
      }
    })
  }
  for (let i = 0; i < threads; i = i + 1) {
    launchWorker()
  }
  ioHandler.workers = workers
  let startInIdle = false
  Object.values(workers).forEach(worker => {
    worker.postMessage({payload: {startInIdle}, secret: 'start'})
    startInIdle = true
  })
}

async function main () {
  console.log('Launching VM')
  const [,, inFile] = process.argv
  const modules = JSON.parse((await fs.readFile(inFile)).toString())

  const cpuCount = os.cpus().length
  spawnVms(modules, cpuCount)
}

main().then().catch((err) => {console.log('Uncaucght fuckup'); console.error(err); process.exit(420)})
