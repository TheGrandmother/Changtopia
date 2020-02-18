const helpers = require('./helpers')


function makeBlockNode(lhs, rhs) {
  return {
    type: 'block',
    lhs: lhs,
    rhs: rhs
  }
}

function makeBlock(d) {
  d = helpers.flattenAndStrip(d)
  if (!Array.isArray(d)) {
    return d
  } else {
    return makeBlockNode(d[0], d[1])
  }
}

module.exports = {
  makeBlockNode,
  makeBlock
}
