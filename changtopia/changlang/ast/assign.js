const helpers = require('./helpers')

function makeBasicAssignmentNode(name, rhs, pos) {
  if (rhs.type === 'closure') {
    // We, or I rather, are forced to pass the name
    // onto the rhs if it is a closure to solve recursion
    rhs.cannonicalName = name
  }
  return {
    type: 'assignment',
    name,
    rhs,
    pos
  }
}

function makeUnpackingAssignmentNode(unpack, rhs, pos) {
  return {
    type: 'unpackingAssignment',
    unpack,
    rhs,
    pos
  }
}

function makeIndexAssigntNode(arrayName, index, rhs, pos) {
  return {
    type: 'indexingAssign',
    arrayName,
    index,
    rhs,
    pos
  }
}

function makeAssignment(d) {
  const position = helpers.findPositionOfToken(d, 'ASSIGN')
  d = helpers.strip(d)
  if (d[0].type === 'unpack') {
    return makeUnpackingAssignmentNode(d[0], d[2], position)
  }
  if (d[0].type === 'arrayIndexing') {
    return makeIndexAssigntNode(d[0].name, d[0].index, d[2], position)
  }
  return makeBasicAssignmentNode(d[0].name, helpers.dropArray(d[2]), position)
}

module.exports = {
  makeAssignment,
  makeBasicAssignmentNode,
  makeUnpackingAssignmentNode,
  makeIndexAssigntNode
}
