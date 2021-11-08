const {toJsString} = require('../../util/strings.js')

const debugFunctions = [
  {
    functionId: '__to_js_string',
    core: true,
    exec: (process, _, arg) => {
      return toJsString(arg)
    }
  },
  {
    functionId: 'dump_process',
    core: true,
    exec: (process) => {
      process.vm.log(JSON.parse(JSON.stringify(process, (key, value) => key === 'vm' ? null : value)))
      return 0
    }
  },
]

module.exports = {debugFunctions}
