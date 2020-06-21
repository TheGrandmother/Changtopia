const {randomHash} = require('../util/hash.js')
const {BaseIO, BaseFileHandle} = require('./BaseIO.js')
const process = require('process')

function makeReply(message, payload, secret) {
  return {sender: message.recipient, recipient: message.sender, id: randomHash(), payload, requestId: message.id, secret}
}

const STORE_KEY = 'chang'
const MANIFEST = `${STORE_KEY}__manifest__`

function getFileKey(name) {
  return `${STORE_KEY}__file__${name}`
}

function createFile(name, content='') {
  const manifest = JSON.parse(localStorage[MANIFEST] || '{}')
  manifest[name] = {
    name,
    created: Date.now(),
    modified: Date.now(),
    size: content.length
  }
  localStorage[MANIFEST] = JSON.stringify(manifest)
  localStorage[getFileKey(name)] = content
}

function updateFile(name, newContent) {
  const manifest = JSON.parse(localStorage[MANIFEST] || '{}')
  manifest[name] = {
    ...manifest[name],
    modified: Date.now(),
    size: newContent.length
  }
  localStorage[MANIFEST] = JSON.stringify(manifest)
}

class BrowserFileHandle extends BaseFileHandle {
  constructor(owner, fileName) {
    super(owner, fileName)
    this.key = getFileKey(fileName)
  }

  getFullContent() {
    return localStorage[this.key]
  }

  write(content) {
    if (localStorage[this.key]) {
      localStorage[getFileKey(name)] = content
      updateFile(this.fileName, content)
    } else {
      createFile(this.key, content)
      localStorage[getFileKey(name)] = content
    }

  }

}

class BrowserIO extends BaseIO {
  constructor(term) {
    super(BrowserFileHandle)
    this.term = term

    this.inputStreamOwner = null
    this.registeredInputListener = false
    this.inputListener = (d) => {console.log('penis:', d)}
    //process.stdin.addListener('data', (d) => { this.inputListener(d) })

  }

  async getTerminalSize() {
    console.log([parseInt(this.term.term.cols), parseInt(this.term.terms.rows)])
    return [parseInt(this.term.term.cols), parseInt(this.term.term.rows)]
  }

  async getModule(moduleName) {
    return JSON.parse(localStorage[`_module_${moduleName}`])
  }

  async listFiles() {
    return Object.keys(JSON.parse(localStorage[MANIFEST]))
  }

  async doesFileExist(name) {
    return !!localStorage[getFileKey(name)]
  }

  shutdown() {
    process.exit()
  }

  writeOut(data) {
    this.term.write(data.replace(/\n/g, '\n\r'))
  }
}

module.exports.BrowserIO = BrowserIO
module.exports.createFile = createFile
