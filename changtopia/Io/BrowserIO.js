const {h} = require('../util/hash.js')
const {toJsString} = require('../util/strings.js')
const {BaseIO, BaseFileHandle, makeReply} = require('./BaseIO.js')

const STORE_KEY = 'chang'
const MANIFEST = `${STORE_KEY}__manifest__`

function getFileKey(name) {
  return `${STORE_KEY}__file__${name}`
}

function getFile(name) {
  return localStorage[getFileKey(name)]
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

  async importFile() {
    throw new Error('importFile must be implemented by the frontend')
  }

  async [h('import')](worker, message) {
    this.importFile() // We will just flat out ignore this dude. We can't handle cancel
    worker.postMessage(makeReply(message, [h('ok')]))
  }

  async [h('export')](worker, message) {
    const name = toJsString(message.payload[0])
    if (await this.doesFileExist(name)) {
      await this.saveFile(name)
      worker.postMessage(makeReply(message, [h('ok')]))
    } else {
      worker.postMessage(makeReply(message, [h('file_not_found')]))
    }
  }

  async getTerminalSize() {
    console.log([parseInt(this.term.term.cols), parseInt(this.term.terms.rows)])
    return [parseInt(this.term.term.cols), parseInt(this.term.term.rows)]
  }

  async getModule(moduleName) {
    return localStorage[`_module_${moduleName}`] && JSON.parse(localStorage[`_module_${moduleName}`])
  }

  async saveModule(module) {
    localStorage[`_module_${module.moduleName}`] = JSON.stringify(module)
  }

  async listFiles() {
    return Object.keys(JSON.parse(localStorage[MANIFEST]))
  }

  async doesFileExist(name) {
    return typeof localStorage[getFileKey(name)] !== 'undefined'
  }

  shutDown() {
    location.reload()
  }

  writeOut(data) {
    this.term.write(data.replace(/\n/g, '\n\r'))
  }

  debugPrint(data) {
    console.log(data)
  }
}

module.exports.BrowserIO = BrowserIO
module.exports.createFile = createFile
module.exports.getFile = getFile
