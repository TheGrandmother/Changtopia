const helpers = require('./helpers')

function makeExprNode(operand, lhs, rhs, pos) {
  return {
    type: 'binop',
    operand,
    lhs,
    rhs,
    pos
  }
}

function makeMath(d) {
  d = helpers.strip(d)
  if (!Array.isArray(d)) {
    return d
  } else {
    const pos = {line: d[1].line, col: d[1].col}
    return makeExprNode(d[1].value, helpers.dropArray(d[0]), helpers.dropArray(d[2]), pos)
  }
}

module.exports = {
  makeExprNode,
  makeMath
}
