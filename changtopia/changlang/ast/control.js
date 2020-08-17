const helpers = require('./helpers')

function makeBlockNode(lhs, rhs) {
  return {
    type: 'block',
    lhs: lhs,
    rhs: rhs,
    pos: lhs.pos
  }
}

function makeJumpNode(label, pos) {
  return {
    type: 'jump',
    label,
    pos
  }
}

function chainStatements(statements, pos) {
  if (statements.length < 2) {
    return statements[0]
  }
  const [first, second, ...rest] = statements
  let block = makeBlockNode(first, second, pos)
  for (let statement of rest) {
    block = makeBlockNode(block, statement, pos)
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
  makeIfNode
}
