const {toJsString} = require('../../util/strings.js')

const debugFunctions = [
  {
    functionId: '_log',
    core: true,
    exec: (process, _, ...args) => {
      console.log(`DBG: ${process.pid}/${process.getCurrentFunctionId()}:\t ${args.join(' ')}`)
    }
  },
  {
    functionId: '__to_js_string',
    core: true,
    exec: (process, _, arg) => {
      return toJsString(arg)
    }
  },
]

module.exports = {debugFunctions}
