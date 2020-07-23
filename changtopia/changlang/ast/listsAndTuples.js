const helpers = require('./helpers')

function makeIdentList(d) {
  const pos = helpers.findPositionOfToken(d, 'BRACKET')
  d = helpers.flattenAndStrip(d)
  return {
    type: 'identList',
    entries: helpers.wrapInArray(d),
    pos,
  }
}

function makeExprList(d) {
  const pos = helpers.findPositionOfToken(d, 'BRACKET')
  d = helpers.strip(d)
  return {
    type: 'exprList',
    entries: helpers.wrapInArray(d),
    pos
  }
}

function makeTuple(d) {
  const pos = helpers.findPositionOfToken(d, 'BRACKET')
  d = helpers.flattenAndStrip(d)
  if (d.length === 0) {
    return {type: 'tuple', body: {type: 'exprList', entries: []}, pos}
  } else {
    return {type: 'tuple', body: d, pos}
  }
}

module.exports = {
  makeIdentList,
  makeExprList,
  makeTuple
}
