const basicInstructions = {
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

  'op' : {
    name: 'op',
    evaluate: (process, op, a1, a2, a3) => {
      const v1 = process.frame.data[a1]
      const v2 = process.frame.data[a2]
      const func = Function('v1', 'v2', `return v1 ${op} v2`)
      const res = func(v1, v2)
      process.frame.data[a3] = res
      process.incrementLine()
    }
  },
}

module.exports = basicInstructions
