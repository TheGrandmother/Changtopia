const helpers = require('./helpers')

function makeExprNode() {
  
}

function makeMath(d) {
  d = helpers.strip(d)
  if (!Array.isArray(d)) {
    return d
  } else {
    return {
      type: 'binop',
      operand: d[1][0],
      lhs: d[0],
      rhs: d[2]
    }
  }
}

