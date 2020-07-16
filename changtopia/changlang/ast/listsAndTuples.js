const helpers = require('./helpers')

function makeIdentList(d) {
  d = helpers.flattenAndStrip(d)
  return {
    type: 'identList',
    entries: helpers.wrapInArray(d)
  }
}

function makeExprList(d) {
  d = helpers.strip(d)
  return {
    type: 'exprList',
    entries: helpers.wrapInArray(d)
  }
}

function makeTuple(d) {
  d = helpers.flattenAndStrip(d)
  if (d.length === 0) {
    return {type: 'tuple', body: {type: 'exprList', entries: []}}
  } else {
    return {type: 'tuple', body: d}
  }
}

module.exports = {
  makeIdentList,
  makeExprList,
  makeTuple
}
