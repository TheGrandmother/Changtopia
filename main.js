const readline = require('readline')
const fs = require('fs').promises

const process = require('process')
const {Worker} = require('worker_threads')
const {h, randomHash} = require('./util/hash.js')


const ioRoutines = {
  [h('print_raw')]: async (worker, message) => {
    console.log(`Printing: From ${message.sender}: ${message.payload}`)
  },
  [h('print')]: async (worker, message) => {
    console.log(String.fromCharCode(...message.payload[0]))
  },
  [h('random')]: async (worker, message) => {
    const val = (Math.random() * Number.MAX_SAFE_INTEGER)
    worker.postMessage({sender: 0, recipient: message.sender, id: randomHash(), payload: val, requestId: message.id})
  },
  [h('readline')]: async (worker, message) => {
    const rl = readline.createInterface({
      input: process.stdin,
      terminal: false
    })

    rl.once('line', function(line){
      worker.postMessage({sender: 0, recipient: message.sender, id: randomHash(), payload: line.split('').map(c => c.charCodeAt(0)), requestId: message.id})
    })
  },
  [h('load_module')]: async (worker, message) => {
    const moduleName = message.payload[0]
    const filePaths = await fs.readdir('.')
    const moduleFiles = filePaths.filter(path => /.*\.tbn$/.test(path))
    for (let file of moduleFiles) {
      const module = JSON.parse((await fs.readFile(file)).toString())
      if (module.moduleName === moduleName) {
        return worker.postMessage({secret: 'module', sender: 0, recipient: message.sender, id: randomHash(), payload: module, requestId: message.id})
      }
    }
    return worker.postMessage({sender: 0, recipient: message.sender, id: randomHash(), payload: h('module_not_found'), requestId: message.id})
  },
}

class IoHandler {
  async handleMessage(worker, message) {
    const [kind, ...payload] = message.payload
    message.payload = payload
    try {
      await ioRoutines[kind](worker, message)
    } catch(err) {
      console.error(`Chaos happened when trying to process IO message:\n ${kind}, ${payload}`)
      throw err
    }
  }
}

const ioHandler = new IoHandler()


function spawnVm(modules) {
  return new Promise((resolve, reject) => {
    const worker = new Worker('./vm.js', {workerData: modules})
    console.log('VM spawned')
    worker.on('error', reject)
    worker.on('message', (message) => ioHandler.handleMessage(worker, message))
    worker.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`))
      }
      resolve()
    })

  })
}

async function main () {
  console.log('Launching VM')
  const [,, inFile] = process.argv
  const modules = JSON.parse((await fs.readFile(inFile)).toString())
  await spawnVm(modules)
  console.log('Things are cool and we are done')
}

main()
