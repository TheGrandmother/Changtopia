const {h, randomHash} = require('../util/hash.js')
const {toJsString, fromJsString} = require('../util/strings.js')
const Pid = require('../VM/pid.js')
const fileHandles = {}

function makeReply(message, payload, secret) {
  return {sender: message.recipient, recipient: message.sender, id: randomHash(), payload, requestId: message.id, secret}
}

class BaseFileHandle {
  constructor (owner, fileName) {
    this.fileName = fileName
    this.owner = owner
    this.pid = new Pid(0, undefined, owner.host)
  }

  async handleMessage(worker, message) {
    const [kind] = message.payload
    await this[kind](worker, message)
  }

  async [h('read_all')](worker, message) {
    const content = await this.getFullContent()
    worker.postMessage(makeReply(message, fromJsString(content)))
  }

  async [h('stat')](worker, message) {
    const stat = await this.stat()
    worker.postMessage(makeReply(message, stat))
  }

  async [h('delete')](worker, message) {
    const content = await this.delete()
    worker.postMessage(makeReply(message, fromJsString(content)))
  }

  async [h('write')](worker, message) {
    const [content] = message.payload
    await this.writeComplete(this.fileName, toJsString(content))
    worker.postMessage(makeReply(message, h('ok')))
  }

  async [h('append')](worker, message) {
    const [content] = message.payload
    await this.writeAppend(toJsString(content))
    worker.postMessage(makeReply(message, h('ok')))
  }
}

class BaseIO {
  constructor(FileHandleInterface) {
    this.FileHandleInterface = FileHandleInterface
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

      [h('debug')]: async (worker, message) => {
        this.debugPrint(String.fromCharCode(...message.payload[0]))
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

      [h('list_files')]: async (worker, message) => {
        const filePaths = await this.listFiles()
        return worker.postMessage(makeReply(message, filePaths.map(fromJsString)))
      },

      [h('open_file')]: async (worker, message) => {
        const fileName = toJsString(message.payload[0])
        if (await this.doesFileExist(fileName)) {
          const fileHandle = new this.FileHandleInterface(message.sender, fileName)
          fileHandles[fileHandle.pid.id] = fileHandle
          return worker.postMessage(makeReply(message, [h('opened'), fileHandle.pid]))
        } else {
          return worker.postMessage(makeReply(message, [h('file_not_found')]))
        }
      },

      [h('create_file')]: async (worker, message) => {
        const fileName = toJsString(message.payload[0])
        if (await this.doesFileExist(fileName)) {
          return worker.postMessage(makeReply(message, [h('file_exists')]))
        } else {
          const fileHandle = new this.FileHandleInterface(message.sender, fileName)
          fileHandles[fileHandle.pid.id] = fileHandle
          return worker.postMessage(makeReply(message, [h('file_not_found')]))
        }
      }
    }
  }
  async handleMessage(worker, message) {
    if (message.recipient.id !== 0) {
      //Request To interface
      if (fileHandles[message.recipient.id]) {
        const fileHandle = fileHandles[message.recipient.id]
        await fileHandle.handleMessage(worker, message)
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
module.exports.BaseFileHandle = BaseFileHandle
