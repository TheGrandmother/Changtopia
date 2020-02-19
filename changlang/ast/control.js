const helpers = require('./helpers')

function makeBlockNode(lhs, rhs) {
  return {
    type: 'block',
    lhs: lhs,
    rhs: rhs
  }
}

function makeJumpNode(lable) {
  return {
    type: 'jump',
    lable
  }
}

function chainStatements(statements) {
  if (statements.length < 2) {
    throw new Error('Can\'t chain single statements')
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

function makeIfNode(condition, body) {
  return {
    type: 'if',
    condition,
    body
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
