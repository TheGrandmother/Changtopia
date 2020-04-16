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
    name: 'return',
    evaluate: (process) => {
      process.returnFromFunction()
    }
  },

  'call' : {
    name: 'call',
    evaluate: (process, module, functionId, returnLocation, ...args) => {
      const _args = []
      args.forEach(a => _args.push(process.frame.data[a]))
      process.bindFunction(module, functionId, returnLocation, _args)
    }
  }
}

module.exports = controlInstructions
