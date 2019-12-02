const {hash} = require('../util/hash.js')

const ops = {
  [hash('move')] : {
    name: 'move',
    evaluate: (process, a1, a2) => {
      process.frame.data[a2] = process.frame.data[a1]
      process.incrementLine()
    }
  },
  [hash('imove')] : {
    name: 'imove',
    evaluate: (process, a1, a2) => {
      process.frame.data[a2] = a1
      process.incrementLine()
    }
  },
  [hash('add')] : {
    name: 'add',
    evaluate: (process, a1, a2, a3) => {
      const v1 = process.frame.data[a1]
      const v2 = process.frame.data[a2]
      process.frame.data[a3] = v1 + v2
      process.incrementLine()
    }
  },

  [hash('op')] : {
    name: 'op',
    evaluate: (process, op, a1, a2, a3) => {
      const v1 = process.frame.data[a1]
      const v2 = process.frame.data[a2]
      const res = Function(v1, v2, `return ${v1} ${op} ${v2}`)
      process.frame.data[a3] = res
      process.incrementLine()
    }
  },

  [hash('jump')] : {
    name: 'jump',
    evaluate: (process, line) => {
      process.setLine(line)
    }
  },

  [hash('jmp_if_true')] : {
    name: 'jump_if_true',
    evaluate: (process, a1, line) => {
      if (process.frame.data[a1]) {
        process.setLine(line)
      }
    }
  },

  [hash('jmp_if_false')] : {
    name: 'jump_if_true',
    evaluate: (process, a1, line) => {
      if (!process.frame.data[a1]) {
        process.setLine(line)
      }
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
