const helpers = require('./helpers')
const {randomHash} = require('../../util/hash.js')
const {makeBasicAssignmentNode} = require('./assign')
const {makeBlockNode, makeIfNode, chainStatements, makeJumpNode} = require('./control')
const {makeExprNode} = require('./expr')
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

function makeClauses(clauses, resultName, doneLabel) {

  return clauses.filter(clause => clause.type).map((clause) => {
    if (clause.pattern.type === 'constant') {
      return makeConstantClause(clause, resultName, doneLabel)
    }
  })
}

function makeMatcher(d) {
  d = helpers.wrapInArray(helpers.strip(d))
  const clauses = helpers.deepStrip(helpers.wrapInArray(helpers.strip(helpers.wrapInArray(d[2].flat()))))
  const expr = d[1]
  const matchIdentifier = randomHash()
  const exprResult = makeIdentifier(`match_expr_${matchIdentifier}`)
  const doneLabel = `match_done_${matchIdentifier}`
  const assignment = makeBasicAssignmentNode(exprResult.name, expr)
  const node = makeBlockNode(assignment, chainStatements(makeClauses(clauses, exprResult, doneLabel)))
  node.subType = 'matcher'
  node.doneLabel = doneLabel
  return node

  //return {
  //  type: 'matcher',
  //  expr,
  //  clauses
  //}
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
