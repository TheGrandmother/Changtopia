const {h, randomHash} = require('../util/hash.js')
const {toJsString} = require('../util/strings.js')
const readline = require('readline')
const process = require('process')
const fs = require('fs').promises
const ansiEscapes = require('ansi-escapes')

// Prepare stdin to fuck up our lives
process.stdin.setRawMode(true)
process.stdin.setEncoding('utf8')
process.stdin.on( 'data',(key) => {
  if ( key === '\u0003' ) {
    process.exit()
  }
})

const ioRoutines = {
  [h('print_raw')]: async (worker, message) => {
    console.log(`Printing: From ${message.sender}: ${message.payload}`)
  },

  [h('print_string')]: async (worker, message) => {
    process.stdout.write(String.fromCharCode(...message.payload[0]))
  },

  [h('move_cursor')]: async (worker, message) => {
    process.stdout.write(ansiEscapes.cursorMove(message.payload[0], message.payload[1]))
  },

  [h('random')]: async (worker, message) => {
    const val = (Math.random() * Number.MAX_SAFE_INTEGER)
    worker.postMessage({sender: 0, recipient: message.sender, id: randomHash(), payload: val, requestId: message.id})
  },

  [h('get_input_stream')]:async (worker, message) => {
    if (process.stdin.readable) {
      worker.postMessage({sender: 0, recipient: message.sender, id: randomHash(), payload: [h('ok')], requestId: message.id})
    }

    process.stdin.addListener('data', function(d) {
      worker.postMessage({sender: 0, recipient: message.sender, id: randomHash(), payload: [[h('input_data'), d.charCodeAt(0)]]})
    })
  },

  [h('read')]: async (worker, message) => {
    const rl = readline.createInterface({
      input: process.stdin,
      terminal: false
    })
    rl.once('data', function (d) {
      console.log('We got dat', d)
      worker.postMessage({sender: 0, recipient: message.sender, id: randomHash(), payload: d, requestId: message.id})
    })
  },

  [h('readline')]: async (worker, message) => {
    const rl = readline.createInterface({
      input: process.stdin,
      terminal: false
    })

    rl.once('line', function (line){
      worker.postMessage({sender: 0, recipient: message.sender, id: randomHash(), payload: line.split('').map(c => c.charCodeAt(0)), requestId: message.id})
    })
  },

  [h('load_module')]: async (worker, message) => {
    const moduleName = toJsString(message.payload[0])
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
