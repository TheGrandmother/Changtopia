const {h} = require('../util/hash.js')
const {inspect} = require('util')
const Errors = require('../errors.js')

const ops = {
  'move' : {
    name: 'move',
    evaluate: (process, a1, a2) => {
      process.frame.data[a2] = process.frame.data[a1]
      process.incrementLine()
    }
  },

  'imove' : {
    name: 'imove',
    evaluate: (process, a1, a2) => {
      process.frame.data[a2] = a1
      process.incrementLine()
    }
  },

  'add' : {
    name: 'add',
    evaluate: (process, a1, a2, a3) => {
      const v1 = process.frame.data[a1]
      const v2 = process.frame.data[a2]
      process.frame.data[a3] = v1 + v2
      process.incrementLine()
    }
  },

  'op' : {
    name: 'op',
    evaluate: (process, op, a1, a2, a3) => {
      const v1 = process.frame.data[a1]
      const v2 = process.frame.data[a2]
      const res = (Function(`return ${v1} ${op} ${v2}`))()
      process.frame.data[a3] = res
      process.incrementLine()
    }
  },

  'jump' : {
    name: 'jump',
    evaluate: (process, line) => {
      process.setLine(line)
    }
  },

  'jump_if_true' : {
    name: 'jump_if_true',
    evaluate: (process, a1, line) => {
      if (process.frame.data[a1]) {
        process.setLine(line)
      } else {
        process.incrementLine()
      }
    }
  },

  'jump_if_false' : {
    name: 'jump_if_false',
    evaluate: (process, a1, line) => {
      if (!process.frame.data[a1]) {
        process.setLine(line)
      } else {
        process.incrementLine()
      }
    }
  },

  'return' : {
    aCount: 0,
    name: 'return',
    evaluate: (process) => {
      process.returnFromFunction()
    }
  },

  'arrayCreate' : {
    name: 'arrayCreate',
    evaluate: (process, location, ...elementLocations) => {
      const array = elementLocations.map(location => process.frame.read(location))
      process.frame.write(location, array)
      process.incrementLine()
    }
  },

  'arrayCreateImmediate' : {
    name: 'arrayCreateImmediate',
    evaluate: (process, location, entries) => {
      const array = entries
      process.frame.write(location, array)
      process.incrementLine()
    }
  },

  'arrayIndexAssign' : {
    name: 'arrayIndexAssign',
    evaluate: (process, location, indexLocation, valueLocation) => {
      const array = process.frame.read(location)
      const index = process.frame.read(indexLocation)
      const value = process.frame.read(valueLocation)
      if (!Array.isArray(array)) {
        throw new Errors.ArrayTypeError(`Data at location ${location} is not an array, it is ${array}`)
      }
      if (index > array.length) {
        throw  new Errors.ArrayIndexError(`Array index ${index} is out of bounds, Array is only ${array.length} long`)
      }
      array[index] = value
      process.incrementLine()
    }
  },

  'arrayIndexGet' : {
    name: 'arrayIndexGet',
    evaluate: (process, location, indexLocation, res) => {
      const array = process.frame.read(location)
      const index = process.frame.read(indexLocation)
      if (!Array.isArray(array)) {
        throw new Errors.ArrayTypeError(`Data at location ${location} is not an array, it is ${array}`)
      }
      if (index > array.length) {
        throw  new Errors.ArrayIndexError(`Array index ${index} is out of bounds, Array is only ${array.length} long`)
      }
      process.frame.write(res, array[index])
      process.incrementLine()
    }
  },

  'arrayUnpack' : {
    name: 'arrayUnpack',
    evaluate: (process, location, hasBody, leadingCount, trailingCount, ...args ) => {
      const array = process.frame.read(location)
      if (!Array.isArray(array)) {
        throw new Errors.ArrayTypeError(`Data at location ${location} is not an array, it is ${array}`)
      }
      if (leadingCount + trailingCount > array.length) {
        throw new Errors.ArrayIndexError(`To many values to unpack. Trying to unpack ${leadingCount + trailingCount} but array contains ${array.length} elements`)
      }

      const leadingLocations = args.slice(0, leadingCount)
      const trailingLocations = args.slice(-1 * trailingCount - 1)
      const bodyLocation = hasBody ? trailingLocations.pop() : undefined

      leadingLocations.forEach((location, i) => process.frame.write(location, array[i]))
      const tailArray = array.slice(-1*trailingLocations.length)
      trailingLocations.forEach((location, i) => process.frame.write(location, tailArray[i]))
      if (bodyLocation) {
        const bodyArray = array.slice(leadingLocations.length).slice(0, array.length - leadingLocations.length - trailingLocations.length)
        process.frame.write(bodyLocation, bodyArray)
      }

      process.incrementLine()
    }
  },

  'call' : {
    name: 'call',
    evaluate: (process, functionId, returnLocation, ...args) => {
      const _args = []
      args.forEach(a => _args.push(process.frame.data[a]))
      process.incrementLine()
      process.bindFunction(functionId, returnLocation, _args)
    }
  }
}

function evaluateInstruction(process, instruction) {
  if (!ops[instruction.id]) {
    throw new Errors.StrangeInstructionError(`I honestly dont know how to evaluate ${inspect(instruction)}`)
  }
  return ops[instruction.id].evaluate(process, ...instruction.args)
}

module.exports = {
  evaluateInstruction
}
