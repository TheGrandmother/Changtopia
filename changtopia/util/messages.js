const {toJsString} = require('./strings.js')
const Pid = require('../VM/pid.js')
const {inspect} = require('util')

function formatMessage (_message) {
  const message = JSON.parse(JSON.stringify(_message))
  message.recipient = Pid.toPid(message.recipient).toString()
  message.sender = Pid.toPid(message.sender).toString()
  message.payload = message.payload.map(thing => {
    if (Array.isArray(thing) && thing.every(Number.isInteger)) {
      return {original: thing, interpretation: toJsString(thing)}
    }
    return thing
  })
  return inspect(message, false, null)
}

module.exports = {formatMessage}
