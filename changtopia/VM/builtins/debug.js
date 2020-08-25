const {toJsString} = require('../../util/strings.js')

const debugFunctions = [
  {
    functionId: '_log',
    bif: true,
    exec: (process, _, ...args) => {
      console.log(`DBG: ${process.pid}/${process.getCurrentFunctionId()}:\t ${args.join(' ')}`)
    }
  },
  {
    functionId: '__to_js_string',
    bif: true,
    exec: (process, _, arg) => {
      return toJsString(arg)
    }
  },
]

module.exports = {debugFunctions}
