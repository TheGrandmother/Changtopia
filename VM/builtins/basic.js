const {fromJsString, toJsString} = require('../../util/strings.js')

const basics = [
  {
    functionId: 'cast',
    bif: true,
    exec: (process, _, value, type) => {
      const casters = {
        'string': (v) => fromJsString(v.toString()),
        'integer': (v) => parseInt(toJsString(v))
      }
      return casters[toJsString(type)](value)
    }
  }
]

module.exports = {basics}
