const {fromJsString, toJsString} = require('../../util/strings.js')
const {h} = require('../../util/hash.js')
const {ArgumentCountError} = require('../../errors.js')

const basics = [
  {
    functionId: 'cast',
    core: true,
    exec: (process, _, value, type, derp) => {
      if (derp) {
        throw new ArgumentCountError('core:cast called with more than 2 arguments you fucking idiot')
      }
      const casters = {
        'string': (v) => fromJsString(v.toString()),
        'integer': (v) => {
          const res = parseInt(Array.isArray(v) ? toJsString(v) : v)
          return isNaN(res) ? h('nan') : res
        }
      }
      return casters[toJsString(type)](value)
    }
  },
  {
    functionId: 'is_atom',
    core: true,
    exec: (process, _, value) => {
      return typeof value === 'string'
    }
  },
  {
    functionId: 'time',
    core: true,
    exec: () => {
      return Date.now()
    }
  },
  {
    functionId: 'to_atom',
    core: true,
    exec: (process, _, value) => {
      return typeof value === 'string' ? value : h(toJsString(value))
    }
  },
]

module.exports = {basics}
