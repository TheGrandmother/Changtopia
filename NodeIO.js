const {h, randomHash} = require('./util/hash.js')
const readline = require('readline')
const process = require('process')
const fs = require('fs').promises

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

class NodeIoHandler {
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

module.exports.NodeIoHandler = NodeIoHandler
