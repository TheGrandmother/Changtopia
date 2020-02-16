const helpers = require('./helpers')

function makeMatcher(d) {
  d = helpers.strip(d)
  return {
    type: 'matcher',
    expr: d[1],
    clauses: helpers.strip(d[2])
  }
}

function makeClause(d) {
  d = helpers.strip(d)
  return {
    type: 'clause',
    pattern: helpers.dropArray(d[0]),
    body: d[1]
  }

}

module.exports = {
  makeMatcher,
  makeClause
}
