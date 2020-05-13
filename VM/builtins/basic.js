const {fromJsString, toJsString} = require('../../util/strings.js')

const basics = [
  {
    functionId: 'cast',
    bif: true,
    exec: (process, _, value, type) => {
      const casters = {
        'string': (v) => fromJsString(v.toString()),
        'integer': (v) => parseInt(Array.isArray(v) ? toJsString(v) : v)
      }
      return casters[toJsString(type)](value)
    }
  },
  {
    functionId: 'time',
    bif: true,
    exec: () => {
      return Date.now()
    }
  },
]

module.exports = {basics}
