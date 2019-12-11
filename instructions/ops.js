const {hash} = require('../util/hash.js')
const {inspect} = require('util')

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

  'arrayIndexAssign' : {
    name: 'arrayIndexAssign',
    evaluate: (process, location, index, value) => {
      const array = process.frame.read(location)
      if (!Array.isArray(array)) {
        throw new Error(`Data at location ${location} is not an array, it is ${array}`)
      }
      if (index > array.length) {
        throw  new Error(`Array index ${index} is out of bounds, Array is only ${array.length} long`)
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
        throw new Error(`Data at location ${location} is not an array, it is ${array}`)
      }
      if (index > array.length) {
        throw  new Error(`Array index ${index} is out of bounds, Array is only ${array.length} long`)
      }
      process.frame.write(res, array[index])
      process.incrementLine()
    }
  },

  'arrayUnpack' : {
    name: 'arrayUnpack',
    evaluate: (process, location, leadingLocations, trailingLocations, bodyLocation ) => {
      const array = process.read(location)
      if (!Array.isArray(array)) {
        throw new Error(`Data at location ${location} is not an array, it is ${array}`)
      }
      if (leadingLocations.length + trailingLocations.length > array.length) {
        throw  new Error(`To many values to unpack. Trying to unpack ${leadingLocations.length + trailingLocations.length} but array contains ${array.length} elements`)
      }

      leadingLocations.forEach((location, i) => process.write(location, array[i]))
      const tailArray = array.slice(-1*trailingLocations.length)
      trailingLocations.forEach((location, i) => process.write(location, tailArray[i]))
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
    throw new Error(`I honestly dont know how to evaluate ${inspect(instruction)}`)
  }
  return ops[instruction.id].evaluate(process, ...instruction.args)
}

module.exports = {
  evaluateInstruction
}
