const {h, randomHash} = require('../util/hash.js')
const {toJsString} = require('../util/strings.js')
const Pid = require('../VM/pid.js')

const interfaces = {}

function makeReply(message, payload, secret) {
  return {sender: message.recipient, recipient: message.sender, id: randomHash(), payload, requestId: message.id, secret}
}

class BaseIO {
  constructor() {
    this.ioRoutines = {
      [h('shut_down')]: async () => {
        this.shutDown()
      },

      [h('print_raw')]: async (worker, message) => {
        this.writeOut(`Printing: From ${message.sender}: ${message.payload}`)
      },

      [h('print_string')]: async (worker, message) => {
        this.writeOut(String.fromCharCode(...message.payload[0]))
      },

      [h('move_cursor')]: async () => {
        throw new Error('the io operation move_cursor has been grevely deprecated')
      },

      [h('random')]: async (worker, message) => {
        const val = (Math.random() * Number.MAX_SAFE_INTEGER)
        worker.postMessage(makeReply(message, val))
      },

      [h('get_console_size')]: async (worker, message) => {
        worker.postMessage(makeReply(message, await this.getTerminalSize()))
      },

      [h('get_input_stream')]: async (worker, message) => {
        if (!this.registeredInputListener) {
          this.registeredInputListener = true
          this.inputListener = (d) => {
            if (!this.inputStreamOwner) {
              return
            }
            const replyBro = {sender: Pid.ioPid(this.inputStreamOwner.host), recipient: this.inputStreamOwner, id: randomHash(), payload: [[h('input_data'), d.charCodeAt(0)]]}
            worker.postMessage(replyBro)
          }
        }
        this.inputStreamOwner = message.sender
      },

      [h('release_input_stream')]: async () => {
        this.inputStreamOwner = null
      },

      [h('load_module')]: async (worker, message) => {
        const module = await this.getModule(toJsString(message.payload[0]))
        if (module) {
          Object.values(worker.workers).forEach(worker => {
            if (worker.instance === message.sender.instance) {
              worker.postMessage(makeReply(message, {module}, 'module'))
            } else {
              worker.postMessage(makeReply(message, {module, sneaky: true}, 'module'))
            }
          })
        } else {
          return worker.postMessage(makeReply(message, h('module_not_found')))
        }
      },

      //[h('list_files')]: async (worker, message) => {
      //  const filePaths = await fs.readdir(PATH)
      //  return worker.postMessage(makeReply(message, filePaths.map(fromJsString)))
      //},

      //[h('open_file')]: async (worker, message) => {
      //  const fileName = PATH + toJsString(message.payload[0])
      //  try {
      //    await fs.access(fileName)
      //    const systemInterface = new FileInterface(message.sender, fileName)
      //    interfaces[systemInterface.pid.id] = systemInterface
      //    return worker.postMessage(makeReply(message, [h('opened'), systemInterface.pid]))
      //  } catch (err) {
      //    return worker.postMessage(makeReply(message, [h('file_not_found')]))
      //  }
      //}
    }
  }
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
        await this.ioRoutines[kind](worker, message)
      } catch(err) {
        console.error(`Chaos happened when trying to process IO message:\n ${kind}, ${payload}`)
        throw err
      }
    }
  }
}

module.exports.BaseIO = BaseIO
