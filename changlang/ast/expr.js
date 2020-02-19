const helpers = require('./helpers')

function makeExprNode(operand, lhs, rhs) {
  return {
    type: 'binop',
    operand,
    lhs,
    rhs
  }
}

function makeMath(d) {
  d = helpers.strip(d)
  if (!Array.isArray(d)) {
    return d
  } else {
    return makeExprNode(d[1][0], d[0], d[2])
  }
}

module.exports = {
  makeExprNode,
  makeMath
}
