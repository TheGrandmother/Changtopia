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

  'call' : {
    name: 'call',
    evaluate: (process, functionId, returnLocation, ...args) => {
      const _args = []
      args.forEach(a => _args.push(process.frame.data[a]))
      process.incrementLine()
      process.bindFunction(functionId, returnLocation, _args)
    }
  },

  'spawn' : {
    name: 'spawn',
    evaluate: (process, functionId, returnLocation, ...args) => {
      const _args = []
      args.forEach(a => _args.push(process.frame.data[a]))
      process.incrementLine()
      process.frame.data[returnLocation] = process.vm.spawnProcess(functionId, _args)
    }
  },

  'await' : {
    name: 'await',
    evaluate: (process, handler) => {
      process.await(handler)
      process.incrementLine()
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
