const {toJsString} = require('../../util/strings.js')

const debugFunctions = [
  {
    functionId: '__to_js_string',
    core: true,
    exec: (process, _, arg) => {
      return toJsString(arg)
    }
  },
]

module.exports = {debugFunctions}
