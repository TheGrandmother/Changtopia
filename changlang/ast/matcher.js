const helpers = require('./helpers')

function makeMatcher(d) {
  d = helpers.strip(d)
  return {
    type: 'matcher',
    expr: d[1],
    clauses: helpers.deepStrip(helpers.strip(d[2].flat()))
  }
}

function makeClause(d) {
  d = helpers.strip(d.flat())
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
