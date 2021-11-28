const equal = require('fast-deep-equal')

const basicInstructions = {
  'move' : {
    name: 'move',
    evaluate: (process, a1, a2) => {
      process.frame.write(a2, process.frame.read(a1))
      process.incrementLine()
    }
  },

  'imove' : {
    name: 'imove',
    evaluate: (process, a1, a2) => {
      process.frame.write(a2, a1)
      process.incrementLine()
    }
  },

  'op' : {
    name: 'op',
    evaluate: (process, op, resLocation, a1, a2 ) => {
      const v1 = process.frame.read(a1)
      const v2 = process.frame.read(a2)
      //const func = Function('v1', 'v2', `return v1 ${op} v2`)
      process.frame.write(resLocation, binops[op](v1, v2))
      process.incrementLine()
    }
  },
}

const eq = (a ,b) => {
  return equal(a, b)
}

const binops = {
  '==': eq,
  '!=': (a ,b) => !eq(a, b),
  '>': (a ,b) => a > b,
  '>=': (a ,b) => a >= b,
  '<=': (a ,b) => a <= b,
  '<': (a ,b) => a < b,
  '&&': (a ,b) => a && b,
  '||': (a ,b) => a || b,
  '+': (a ,b) => a + b,
  '-': (a ,b) => a - b,
  '*': (a ,b) => a * b,
  '/': (a ,b) => a / b,
  '%': (a ,b) => a % b,
}

module.exports = basicInstructions
