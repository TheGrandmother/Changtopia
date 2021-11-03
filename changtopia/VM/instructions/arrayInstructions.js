const Errors = require('../../errors.js')

function quickUnpack(process, location, array, hasBody, leadingCount, trailingCount, args) {
  if (!hasBody) {
    if(trailingCount === 0) {
      // [a,b,c] complete unpack
      array.forEach((e, i) => {
        process.frame.write(args[i], e)
      })
    }
    if (trailingCount !== 0) {
      throw new Error('We are trying to do a complete unpack but for some dumb reason the trailing count aint 0')
    }
    return true
  }
  if (trailingCount === 0 && leadingCount !== 0) {
    // [a, b, ...x, <<blob>>] Head unpack
    for (let i = 0; i < leadingCount; i++) {
      process.frame.write(args[i], array[i])
    }
    process.frame.write(args[args.length - 1], array.slice(leadingCount))
    return true
  }
  if (leadingCount === 0 && trailingCount !== 0) {
    // [<<blob>>, a, b, ...x] tail unpack
    for (let i = 0; i < trailingCount; i++) {
      process.frame.write(args[i], array[array.length - i - 1])
    }
    process.frame.write(args[args.length - 1], array.slice(0, -trailingCount))
    return true
  }
  return false
}

function quickPush(process, location, values) {
  const arr = process.frame.read(location)
  for (let i = 0; i < values.length; i++ ) {
    const val = process.frame.read(values[i])
    if (val.shared) {
      // This pretty much never happens
      // Can possibly be droppen
      arr[arr.length + i] = val.slice()
      val.shared = false
    } else {
      arr[arr.length + i] = val
    }
  }
  //arr.shared = true
  process.frame.write(location, arr)
}

function quickCreate(process, location, blobs) {
  return process.frame.write(location, blobs.map((b) => process.frame.read(b)).flat())
}

const arrayInstructions = {
  'arrayCreate' : {
    name: 'arrayCreate',
    evaluate: (process, location, blobCount, ...things) => {
      if (blobCount === 1 && things[0] === 0 && things[1] === location) {
        quickPush(process, location, things.slice(2))
        process.incrementLine()
        return
      }
      if (blobCount === things.length) {
        quickCreate(process, location, things)
        process.incrementLine()
        return
      }
      const blobLocations = things.slice(0, blobCount)
      const entries = things.slice(blobCount)
      let array = []
      entries.forEach((entry, i) => {
        if (blobLocations.includes(i)) {
          const arr = process.frame.read(entry)
          if (!Array.isArray(arr)) {
            throw new Errors.ArrayTypeError(`Data at location ${entry} is not an array, it is ${arr} of type ${typeof arr}`)
          }
          if (arr.shared) {
            array = array.concat(arr.slice())
            arr.shared = false
          } else {
            array = array.concat(arr)
          }
        } else {
          const stuff = process.frame.read(entry)
          if (stuff.shared) {
            array.push(stuff.slice())
            array.sahred = false
          } else {
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
      process.frame.write(location, entries)
      process.incrementLine()
    }
  },

  'arrayLength' : {
    name: 'arrayLength',
    evaluate: (process, resLocation, location) => {
      const array = process.frame.read(location)
      if (!Array.isArray(array)) {
        throw new Errors.ArrayTypeError(`Data at location ${location} is not an array, it is ${array} of type ${typeof array}`)
      }
      process.frame.write(resLocation, array.length)
      process.incrementLine()
    }
  },

  'isArray' : {
    name: 'isArray',
    evaluate: (process, resLocation, location) => {
      const array = process.frame.read(location)
      process.frame.write(resLocation, Array.isArray(array))
      process.incrementLine()
    }
  },

  'arrayUnpack' : {
    name: 'arrayUnpack',
    evaluate: (process, location, hasBody, leadingCount, trailingCount, ...args ) => {
      const array = process.frame.read(location)
      if (!Array.isArray(array)) {
        throw new Errors.ArrayTypeError(`Data at location ${location} is not an array, it is ${array} of type ${typeof array}`)
      }
      if (leadingCount + trailingCount > array.length) {
        throw new Errors.ArrayIndexError(`To many values to unpack. Trying to unpack ${leadingCount + trailingCount} but array contains ${array.length} elements`)
      }
      if (!hasBody && leadingCount + trailingCount !== array.length) {
        throw new Errors.ArrayIndexError(`To few values to unpack. Trying to unpack ${leadingCount + trailingCount} elements but array contains ${array.length} elements`)
      }

      const wasQuick = quickUnpack(process, location, array, hasBody, leadingCount, trailingCount, args)
      if (wasQuick) {
        process.incrementLine()
        return
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
