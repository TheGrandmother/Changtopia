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
    return makeExprNode(d[1].value, helpers.dropArray(d[0]), helpers.dropArray(d[2]))
  }
}

module.exports = {
  makeExprNode,
  makeMath
}
