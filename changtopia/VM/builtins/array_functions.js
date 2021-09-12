const deepEquals = require('deep-equal')
const {ArrayTypeError} = require('../../errors.js')

const arrayFunctions = [
  {
    functionId: 'array_compare',
    core: true,
    exec: (process, resultLocation, a1Location, a2Location) => {
      const a1 = a1Location
      const a2 = a2Location
      if (!Array.isArray(a1)) {
        throw new ArrayTypeError(`Data at location ${a1Location} is not an array, it is ${a1} of type ${typeof a1}`)
      }
      if (!Array.isArray(a2)) {
        throw new ArrayTypeError(`Data at location ${a2Location} is not an array, it is ${a2} of type ${typeof a2}`)
      }
      const equals = a1.length === a2.length && deepEquals(a1, a2)
      return equals
    }
  },
  {
    functionId: 'is_array',
    core: true,
    exec: (process, resultLocation, location) => {
      return Array.isArray(location)
    }
  },
  {
    functionId: 'length',
    core: true,
    exec: (process, resultLocation, faff) => {
      return faff.length
    }
  },
  {
    functionId: 'flatten',
    core: true,
    exec: (process, resultLocation, arr, depth) => {
      return arr.flat(depth)
    }
  },
  {
    functionId: 'range',
    core: true,
    exec: (process, resultLocation, min, max, _step) => {
      const step = typeof _step === 'undefined' ? 1 : _step
      const arr = []
      if (min < max && step > 0) {
        for (let n = min; n < max; n = n + step) {
          arr.push(n)
        }
      } else if (min > max && step < 0) {
        for (let n = max; n > min; n = n - step) {
          arr.push(n)
        }
      }
      return arr
    }
  },
]

module.exports = {arrayFunctions}
