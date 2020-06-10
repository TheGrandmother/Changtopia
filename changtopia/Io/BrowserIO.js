const {randomHash} = require('../util/hash.js')
const {BaseIO} = require('./BaseIO.js')
const process = require('process')

function makeReply(message, payload, secret) {
  return {sender: message.recipient, recipient: message.sender, id: randomHash(), payload, requestId: message.id, secret}
}

class BrowserIO extends BaseIO {
  constructor(term) {
    super()
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

  shutdown() {
    process.exit()
  }

  writeOut(data) {
    this.term.write(data.replace(/\n/g, '\n\r'))
  }
}

module.exports.BrowserIO = BrowserIO
