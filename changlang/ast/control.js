const helpers = require('./helpers')

function makeBlockNode(lhs, rhs) {
  return {
    type: 'block',
    lhs: lhs,
    rhs: rhs
  }
}

function makeJumpNode(label) {
  return {
    type: 'jump',
    label
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

function makeIfNode(lhs, rhs) {
  return {
    type: 'if',
    lhs,
    rhs
  }
}

function makeIfStatement(d) {
  d = helpers.strip(d)
  return makeIfNode(d[0], d[1])
}

module.exports = {
  makeBlockNode,
  makeBlock,
  chainStatements,
  makeJumpNode,
  makeIfStatement,
  makeIfNode
}
