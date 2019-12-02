const {hash} = require('../util/hash.js')

const ops = {
  [hash('move')] : {
    argCount: 2,
    name: 'move',
    evaluate: (process, a1, a2) => {
      process.frame.data[a2] = process.frame.data[a1]
      process.incrementLine()
    }
  },
  [hash('imove')] : {
    argCount: 2,
    name: 'imove',
    evaluate: (process, a1, a2) => {
      process.frame.data[a2] = a1
      process.incrementLine()
    }
  },
  [hash('add')] : {
    aCount: 3,
    name: 'add',
    evaluate: (process, a1, a2, a3) => {
      const v1 = process.frame.data[a1]
      const v2 = process.frame.data[a2]
      process.frame.data[a3] = v1 + v2
      process.incrementLine()
    }
  },

  [hash('return')] : {
    aCount: 0,
    name: 'return',
    evaluate: (process) => {
      process.returnFromFunction()
    }
  },

  [hash('call')] : {
    name: 'call',
    evaluate: (process, functionId, returnLocation, ...args) => {
      const _args = {}
      args.forEach(a => _args[a] = process.frame.data[a])
      process.incrementLine()
      process.bindFunction(functionId, returnLocation, _args)
    }
  }
}

module.exports = {
  ops
}
