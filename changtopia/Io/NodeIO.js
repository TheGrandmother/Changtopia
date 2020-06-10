const {h, randomHash} = require('../util/hash.js')
const {toJsString, fromJsString} = require('../util/strings.js')
const Pid = require('../VM/pid.js')
const {BaseIO} = require('./BaseIO.js')
const process = require('process')
const fs = require('fs').promises
const util = require('util')
const exec = util.promisify(require('child_process').exec)

const PATH = '.tbn_runtime/'

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


class NodeIoHandler extends BaseIO {
  constructor() {
    super()
    process.stdin.setRawMode(true)
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', key => {
      if ( key === '\u0003' ) {
        process.exit()
      }
    })

    process.stdin.addListener('data', (d) => { this.inputListener(d) })

    this.inputStreamOwner = null
    this.registeredInputListener = false
  }

  async getTerminalSize() {
    const {stdout: rows} = await exec('tput lines')
    const {stdout: cols} = await exec('tput cols')
    return [parseInt(cols), parseInt(rows)]
  }

  async getModule(moduleName) {
    const filePaths = await fs.readdir('./tbn_modules')
    const moduleFiles = filePaths.filter(path => /.*\.tbn$/.test(path))
    for (let file of moduleFiles) {
      const module = JSON.parse((await fs.readFile('./tbn_modules/' + file)).toString())
      if (module.moduleName === moduleName) {
        return module
      }
    }
  }

  shutDown() {
    process.exit()
  }

  writeOut(...args) {
    process.stdout.write(...args)
  }
}

module.exports.NodeIoHandler = NodeIoHandler
