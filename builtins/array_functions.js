const deepEquals = require('deep-equal')
const {ArrayTypeError} = require('../errors.js')

const arrayFunctions = [
  {
    functionId: 'array_compare',
    bif: true,
    exec: (process, resultLocation, a1Location, a2Location) => {
      const a1 = process.frame.read(a1Location)
      const a2 = process.frame.read(a2Location)
      if (!Array.isArray(a1)) {
        throw new ArrayTypeError(`Data at location ${a1Location} is not an array, it is ${a1}`)
      }
      if (!Array.isArray(a2)) {
        throw new ArrayTypeError(`Data at location ${a2Location} is not an array, it is ${a2}`)
      }
      const equals =  a1.length === a2.length && deepEquals(a1, a2)
      return equals
    }
  },
  {
    functionId: 'is_array',
    bif: true,
    exec: (process, resultLocation, location) => {
      const arr = process.frame.read(location)
      return Array.isArray(arr)
    }
  },
  {
    functionId: 'length',
    bif: true,
    exec: (process, resultLocation, location) => {
      const arr = process.frame.read(location)
      if (!Array.isArray(arr)) {
        throw new ArrayTypeError(`Data at location ${location} is not an array, it is ${arr}`)
      }
      return arr.length
    }
  },
]

module.exports = {arrayFunctions}
