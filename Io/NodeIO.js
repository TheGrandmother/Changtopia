const {h, randomHash} = require('../util/hash.js')
const {toJsString, fromJsString} = require('../util/strings.js')
const Pid = require('../VM/pid.js')
const process = require('process')
const fs = require('fs').promises
const ansiEscapes = require('ansi-escapes')

const PATH = '.tbn_runtime/'

class FileInterface {
  constructor (owner, fileName) {
    this.fileName = fileName
    this.owner = owner
    this.pid = new Pid(0)

    this.handlers = {
      [h('read')]: (worker, message) => this.read(worker, message)
    }

  }

  async handleMessage(worker, message) {
    const [kind] = message.payload
    await this.handlers[kind](worker, message)
  }

  async read(worker, message) {
    console.log(this)
    const content =  await fs.readFile(this.fileName, {encoding: 'utf-8'})
    console.log(content)
    worker.postMessage(makeReply(message, fromJsString(content)))
  }
}

const interfaces = {}

function makeReply(message, payload, secret) {
  return {sender: message.recipient, recipient: message.sender, id: randomHash(), payload, requestId: message.id, secret}
}

const ioRoutines = {
  [h('shut_down')]: async () => {
    process.exit()
  },

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
    worker.postMessage(makeReply(message, val))
  },

  [h('get_input_stream')]:async (worker, message) => {
    process.stdin.setRawMode(true)
    process.stdin.setEncoding('utf8')
    process.stdin.on( 'data',(key) => {
      if ( key === '\u0003' ) {
        process.exit()
      }
    })

    if (process.stdin.readable) {
      worker.postMessage(makeReply(message, [h('ok')]))
    }

    process.stdin.addListener('data', function(d) {
      worker.postMessage(makeReply(message, [[h('input_data'), d.charCodeAt(0)]]))
    })
  },

  [h('load_module')]: async (worker, message) => {
    const moduleName = toJsString(message.payload[0])
    const filePaths = await fs.readdir('./tbn_modules')
    const moduleFiles = filePaths.filter(path => /.*\.tbn$/.test(path))
    for (let file of moduleFiles) {
      const module = JSON.parse((await fs.readFile('./tbn_modules/' + file)).toString())
      if (module.moduleName === moduleName) {
        return worker.postMessage(makeReply(message, module, 'module'))
      }
    }
    return worker.postMessage(makeReply(message, h('module_not_found')))
  },

  [h('list_files')]: async (worker, message) => {
    const filePaths = await fs.readdir(PATH)
    return worker.postMessage(makeReply(message, filePaths.map(fromJsString)))
  },

  [h('open_file')]: async (worker, message) => {
    const fileName = PATH + toJsString(message.payload[0])
    try {
      await fs.access(fileName)
      const systemInterface = new FileInterface(message.sender, fileName)
      interfaces[systemInterface.pid.id] = systemInterface
      console.log(systemInterface)
      return worker.postMessage(makeReply(message, [h('opened'), systemInterface.pid]))
    } catch (err) {
      return worker.postMessage(makeReply(message, [h('file_not_found')]))
    }
  }
}

class NodeIoHandler {
  async handleMessage(worker, message) {
    if (message.recipient.id !== 0) {
      //Request To interface
      if (interfaces[message.recipient.id]) {
        const systemInterface = interfaces[message.recipient.id]
        await systemInterface.handleMessage(worker, message)
      } else {
        console.error('no interface')
        return worker.postMessage(makeReply(message, [h('interface_not_found')]))
      }
    } else {
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
}

module.exports.NodeIoHandler = NodeIoHandler
