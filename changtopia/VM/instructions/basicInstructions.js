const equal = require('fast-deep-equal')
const {StupidMath} = require('../../errors.js')

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
      if (mathyOps.includes(op)) {
        if (isNaN(v1)) {
          throw new StupidMath(`Can't do math with ${a1} it is ${v1}`)
        }
        if (isNaN(v2)) {
          throw new StupidMath(`Can't do math with ${a2} it is ${v2}`)
        }
      }
      process.frame.write(resLocation, binops[op](v1, v2))
      process.incrementLine()
    }
  },
}

const eq = (a ,b) => {
  return equal(a, b)
}

const mathyOps = ['>', '<', '>=', '<=', '+', '-', '*', '/', '%']


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
  '/': (a ,b) => { if (b != 0) { return a / b } else { throw new StupidMath(`Tryna divide ${a} with zero`)} },
  '%': (a ,b) => a % b,
}

module.exports = basicInstructions
