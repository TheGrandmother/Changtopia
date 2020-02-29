const helpers = require('./helpers')
const {randomHash} = require('../../util/hash.js')
const {makeBasicAssignmentNode} = require('./assign')
const {makeBlockNode, makeIfNode, chainStatements, makeJumpNode} = require('./control')
const {makeExprNode} = require('./expr')
const {makeFunctionCallNode} = require('./functions')
const {inspect} = require('util')
console._log = (...args) => console.log(args.map(arg => inspect(arg, false,null,true)).join(' '))

function makeIdentifier(name) {
  return {
    type: 'identifier',
    name: name,
  }
}

function makeConstantClause(clause, resultName, doneLabel) {
  const compare = makeExprNode('==', resultName, clause.pattern)
  const body = makeBlockNode(clause.body, makeJumpNode(doneLabel))
  return makeIfNode(compare, body)

}

function makePatternClause(clause, resultName, doneLabel) {
  const longAssSequence = []
  const pattern = clause.pattern
  const hasBlob = !!pattern.entries.find(e => e.type === 'blob')
  const targetLength = pattern.entries.length - (hasBlob ? 1 : 0)

  //Assert corrent length
  const lengthCall = makeFunctionCallNode('length', resultName, 'bif')
  const compare = makeExprNode(hasBlob ? '>=' : '==', lengthCall, {type: 'constant', value: targetLength})
  longAssSequence.push(makeIfNode(compare, makeJumpNode(doneLabel)))

  const body = makeBlockNode(clause.body, makeJumpNode(doneLabel))
  return body

}

function makeClauses(clauses, resultName, doneLabel) {

  return clauses.filter(clause => clause.type).map((clause) => {
    if (clause.pattern.type === 'constant') {
      return makeConstantClause(clause, resultName, doneLabel)
    }
    if (clause.pattern.type === 'arrayLitterall') {
      return makePatternClause(clause, resultName, doneLabel)
    }
  })
}

function makeMatcher(d) {
  d = helpers.wrapInArray(helpers.strip(d))
  const clauses = helpers.deepStrip(helpers.wrapInArray(helpers.strip(helpers.wrapInArray(d[2].flat())))).flat(Infinity)
  console._log(clauses)
  const expr = d[1]
  const matchIdentifier = randomHash()
  const exprResult = makeIdentifier(`match_expr_${matchIdentifier}`)
  const doneLabel = `match_done_${matchIdentifier}`
  const assignment = makeBasicAssignmentNode(exprResult.name, expr)
  const node = makeBlockNode(assignment, chainStatements(makeClauses(clauses, exprResult, doneLabel)))
  node.subType = 'matcher'
  node.doneLabel = doneLabel
  return node
}

function makeClause(d) {
  d = helpers.strip(d.flat())
  return {
    type: 'clause',
    pattern: helpers.strip(d[0]),
    body: d[1]
  }

}

module.exports = {
  makeMatcher,
  makeClause
}
