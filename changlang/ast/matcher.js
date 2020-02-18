const helpers = require('./helpers')
const {randomHash} = require('../../util/hash.js')
const {makeBasicAssignmentNode} = require('./assign')
const {makeBlockNode} = require('./control')

function makeConstantClause(node) {

}

function makeMatcher(d) {
  d = helpers.wrapInArray(helpers.strip(d))
  const clauses = helpers.strip(helpers.wrapInArray(d[2].flat()))
  const expr = d[1]
  const matchIdentifier = randomHash()
  const matchExprName = `match_expr_${matchIdentifier}`
  const matchDoneLabel = `match_done_${matchIdentifier}`
  const assignment = makeBasicAssignmentNode(matchExprName, expr)
  return makeBlockNode(assignment, clauses)

  //return {
  //  type: 'matcher',
  //  expr,
  //  clauses
  //}
}

function makeClause(d) {
  d = helpers.strip(d.flat())
  console.log(helpers.strip(d[0]))
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
