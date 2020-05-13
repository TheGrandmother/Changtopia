const {h, randomHash} = require('../util/hash.js')
const {toJsString, fromJsString} = require('../util/strings.js')
const Pid = require('../VM/pid.js')
const process = require('process')
const fs = require('fs').promises
const ansiEscapes = require('ansi-escapes')
const util = require('util')
const exec = util.promisify(require('child_process').exec)

const PATH = '.tbn_runtime/'

let inputStreamOwner = null
let inputStreamHandler = null
process.stdin.setRawMode(true)
process.stdin.setEncoding('utf8')
process.stdin.on('data', key => {
  if ( key === '\u0003' ) {
    process.exit()
  }
})

class FileInterface {
  constructor (owner, fileName) {
    this.fileName = fileName
    this.owner = owner
    this.pid = new Pid(0, undefined, owner.host)

    this.handlers = {
      [h('read')]: (worker, message) => this.read(worker, message)
    }

  }

  async handleMessage(worker, message) {
    const [kind] = message.payload
    await this.handlers[kind](worker, message)
  }

  async read(worker, message) {
    const content =  await fs.readFile(this.fileName, {encoding: 'utf-8'})
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

  [h('get_console_size')]: async (worker, message) => {
    const {stdout: rows} = await exec('tput lines')
    const {stdout: cols} = await exec('tput cols')
    worker.postMessage(makeReply(message, [parseInt(cols), parseInt(rows)]))
  },

  [h('get_input_stream')]: async (worker, message) => {
    if (inputStreamHandler) {
      process.stdin.removeListener('data', inputStreamHandler)
    }
    inputStreamHandler = (d) => worker.postMessage(makeReply(message, [[h('input_data'), d.charCodeAt(0)]]))

    if (process.stdin.readable) {
      worker.postMessage(makeReply(message, [h('ok')]))
    }
    process.stdin.addListener('data', inputStreamHandler)
  },

  [h('load_module')]: async (worker, message) => {
    const moduleName = toJsString(message.payload[0])
    const filePaths = await fs.readdir('./tbn_modules')
    const moduleFiles = filePaths.filter(path => /.*\.tbn$/.test(path))
    for (let file of moduleFiles) {
      const module = JSON.parse((await fs.readFile('./tbn_modules/' + file)).toString())
      if (module.moduleName === moduleName) {
        Object.values(worker.workers).forEach(worker => {
          if (worker.instance === message.sender.instance) {
            worker.postMessage(makeReply(message, {module}, 'module'))
          } else {
            worker.postMessage(makeReply(message, {module, sneaky: true}, 'module'))
          }
        })
        return
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
      return worker.postMessage(makeReply(message, [h('opened'), systemInterface.pid]))
    } catch (err) {
      return worker.postMessage(makeReply(message, [h('file_not_found')]))
    }
  },

  [h('spawn_process')]: async (worker, message) => {
    // Due to me being lazy we just pick a random worker to receive the new process
    const workers = Object.values(worker.workers)
    const assignedWorker = workers[parseInt(Math.random() * workers.length)]
    const pid = new Pid(assignedWorker.instance, randomHash(), assignedWorker.host)
    assignedWorker.postMessage({payload: [pid, ...message.payload], secret: 'spawn'})
    if (message.requiresResponse) {
      return worker.postMessage(makeReply(message, pid))
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
