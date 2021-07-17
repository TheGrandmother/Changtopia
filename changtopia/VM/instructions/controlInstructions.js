const {RuntimeError} = require('../../errors.js')
const {toJsString} = require('../../util/strings.js')

const controlInstructions = {
  'jump' : {
    name: 'jump',
    evaluate: (process, line) => {
      process.setLine(line)
    }
  },

  'jump_if_true' : {
    name: 'jump_if_true',
    evaluate: (process, a1, line) => {
      if (process.frame.read(a1)) {
        process.setLine(line)
      } else {
        process.incrementLine()
      }
    }
  },

  'jump_if_false' : {
    name: 'jump_if_false',
    evaluate: (process, a1, line) => {
      if (!process.frame.read(a1)) {
        process.setLine(line)
      } else {
        process.incrementLine()
      }
    }
  },

  'throw' : {
    name: 'throw',
    evaluate: (process, atom, message) => {
      throw new RuntimeError(toJsString(process.frame.read(message)), process.frame.read(atom))
    }
  },

  'return' : {
    name: 'return',
    evaluate: (process, returnValue) => {
      process.frame.write('__return__', process.frame.read(returnValue))
      process.returnFromFunction()
    }
  },

  'call' : {
    name: 'call',
    evaluate: (process, module, functionId, returnLocation, ...args) => {
      const _args = []
      // ENSURE PASS BY VALUE
      // Could be faster
      args.forEach(a => {
        const val = process.frame.read(a)
        if (val.shared) {
          _args.push(val.slice())
        } else {
          _args.push(val)
        }
      })
      process.bindFunction(module, functionId, returnLocation, _args)
    }
  }
}

module.exports = controlInstructions
