const {h, randomHash} = require('../util/hash.js')
const {toJsString, fromJsString} = require('../util/strings.js')
const Pid = require('../VM/pid.js')
const fileHandles = {}
const {changpile} = require('../changlang/compiler.js')
const {CompilerError} = require('../errors.js')

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
  }

  async changpile(input, options) {
    const _options = {
      doTailOptimization: !options.includes(h('no_tail_opt')),
      doMoveOptimization: false, //Diss dude be broken
      showAST: !!options.includes(h('show_ast')),
      showIntermediate: !!options.includes(h('show_intermediate')),
      prettyPrint: !!options.includes(h('show_compiled')),
      showAmbigous: false,
    }
    const result = changpile(input, _options)
    if (result.completed) {
      await this.saveModule(result)
      return [h('ok'), fromJsString(result.moduleName)]
    }
    if (result.ast) {
      return [h('ast'), fromJsString(result.ast)]
    }
    if (result.intermediate) {
      return [h('intermediate'), fromJsString(result.intermediate)]
    }
    if (result.pretty) {
      return [h('pretty'), fromJsString(result.pretty)]
    }
  }

  async [h('changpile')](worker, message) {
    const [input, options] = message.payload
    try {
      const result = await this.changpile(toJsString(input), options)
      worker.postMessage(makeReply(message, result))
    } catch (err) {
      console.log(err)
      if (err instanceof CompilerError) {
        worker.postMessage(makeReply(message, [h('error'), fromJsString(`${err.message}\n${err.preview ? err.preview + '\n' : ''}`)]))
      } else {
        throw err
      }
    }
  }

  async [h('chillax')](worker, message) {
    setTimeout(()=> {
      worker.postMessage(makeReply(message, [h('oki')]))
    }, message.payload[0])
  }

  async [h('shut_down')]() {
    this.shutDown()
  }

  async [h('print_raw')](worker, message) {
    this.writeOut(`Printing: From ${message.sender}: ${message.payload}`)
  }

  async [h('print_string')](worker, message) {
    this.writeOut(String.fromCharCode(...message.payload[0]))
  }

  async [h('debug')](worker, message) {
    this.debugPrint(String.fromCharCode(...message.payload[0]))
  }

  async [h('move_cursor')]() {
    throw new Error('the io operation move_cursor has been grevely deprecated')
  }

  async [h('random')](worker, message) {
    const val = (Math.random() * Number.MAX_SAFE_INTEGER)
    worker.postMessage(makeReply(message, val))
  }

  async [h('get_console_size')](worker, message) {
    worker.postMessage(makeReply(message, await this.getTerminalSize()))
  }

  async [h('get_input_stream')](worker, message) {
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
  }

  async [h('release_input_stream')]() {
    this.inputStreamOwner = null
  }

  async [h('load_module')](worker, message) {
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
  }

  async [h('has_module')](worker, message){
    return worker.postMessage({...message, secret: 'has_module'})
  }

  async [h('list_files')](worker, message) {
    const filePaths = await this.listFiles()
    return worker.postMessage(makeReply(message, filePaths.map(fromJsString)))
  }

  async [h('open_file')](worker, message) {
    const fileName = toJsString(message.payload[0])
    if (await this.doesFileExist(fileName)) {
      const fileHandle = new this.FileHandleInterface(message.sender, fileName)
      fileHandles[fileHandle.pid.id] = fileHandle
      return worker.postMessage(makeReply(message, [h('opened'), fileHandle.pid]))
    } else {
      return worker.postMessage(makeReply(message, [h('file_not_found')]))
    }
  }

  async [h('create_file')](worker, message) {
    const fileName = toJsString(message.payload[0])
    if (await this.doesFileExist(fileName)) {
      return worker.postMessage(makeReply(message, [h('file_exists')]))
    } else {
      const fileHandle = new this.FileHandleInterface(message.sender, fileName)
      fileHandles[fileHandle.pid.id] = fileHandle
      return worker.postMessage(makeReply(message, [h('file_not_found')]))
    }
  }

  async [h('raw_debug')](worker, message) {
    console.log(message.payload[0])
  }

  async [h('debug_dump')](worker, message) {
    Object.values(worker.workers).forEach(worker => {
      worker.postMessage(makeReply(message, h('dump_vm'), 'dump'))
    })
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
        await this[kind](worker, message)
      } catch(err) {
        console.error(`Chaos happened when trying to process IO message:\n ${kind}, ${payload}`)
        throw err
      }
    }
  }
}

module.exports.BaseIO = BaseIO
module.exports.BaseFileHandle = BaseFileHandle
module.exports.makeReply = makeReply
