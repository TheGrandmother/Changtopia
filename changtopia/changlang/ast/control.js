const helpers = require('./helpers')

function makeBlockNode(lhs, rhs) {
  return {
    type: 'block',
    lhs: lhs,
    rhs: rhs
  }
}

function makeJumpNode(label, pos) {
  return {
    type: 'jump',
    label,
    pos
  }
}

function makeJumpIfFalseNode(val, label, pos) {
  return {
    type: 'jump_if_false',
    val,
    label,
    pos
  }
}

function chainStatements(statements) {
  if (statements.length < 2) {
    return statements[0]
  }
  const [first, second, ...rest] = statements
  let block = makeBlockNode(first, second)
  for (let statement of rest) {
    block = makeBlockNode(block, statement)
  }
  return block
}

function makeBlock(d) {
  d = helpers.flattenAndStrip(d)
  if (!Array.isArray(d)) {
    return d
  } else {
    return makeBlockNode(d[0], d[1])
  }
}

function makeIfNode(lhs, rhs, pos) {
  return {
    type: 'if',
    lhs,
    rhs,
    pos
  }
}

function makeIfStatement(d) {
  const pos = helpers.findPositionOfToken(d, 'IF')
  d = helpers.flattenAndStrip(d)
  return makeIfNode(d[1], d[2], pos)
}

module.exports = {
  makeBlockNode,
  makeBlock,
  chainStatements,
  makeJumpNode,
  makeIfStatement,
  makeIfNode,
  makeJumpIfFalseNode
}
