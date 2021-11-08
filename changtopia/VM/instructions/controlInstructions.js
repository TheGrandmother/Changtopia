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
      const val = process.frame.read(returnValue)
      process.frame.write('__return__', val)
      process.returnFromFunction()
    }
  },

  'call' : {
    name: 'call',
    evaluate: (process, module, functionId, returnLocation, ...args) => {
      process.bindFunction(module, functionId, returnLocation, args.map(loc => process.frame.read(loc)))
    }
  }
}

module.exports = controlInstructions
