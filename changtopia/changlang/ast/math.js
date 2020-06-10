const helpers = require('./helpers')

function makeExprNode(operand, lhs, rhs) {
  return {
    type: 'binop',
    operand,
    lhs,
    rhs
  }
}

function makeExpr(d) {
  d = helpers.strip(d)
  if (!Array.isArray(d)) {
    return d
  } else {
    return makeExprNode
    return {
      type: 'binop',
      operand: d[1][0],
      lhs: d[0],
      rhs: d[2]
    }
  }
}
