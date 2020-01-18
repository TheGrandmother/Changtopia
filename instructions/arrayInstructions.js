const Errors = require('../errors.js')

const arrayInstructions = {
  'arrayCreate' : {
    name: 'arrayCreate',
    evaluate: (process, location, blobCount, ...things) => {
      const blobLocations = things.slice(0, blobCount)
      const entries = things.slice(blobCount)
      const array = []
      entries.forEach((entry, i) => {
        if (blobLocations.includes(i)) {
          const arr = process.frame.read(entry)
          if (!Array.isArray(arr)) {
            throw new Errors.ArrayTypeError(`Data at location ${location} is not an array, it is ${array}`)
          }
          array.push(...arr)
        } else {
          const stuff = process.frame.read(entry)
          if (Array.isArray(stuff)) {
            array.push(stuff)
          }else {
            array.push(stuff)
          }
        }
      })
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
}

module.exports = arrayInstructions
