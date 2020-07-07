const helpers = require('./helpers')

function makeBasicAssignmentNode(name, rhs) {
  if (rhs.type === 'closure') {
    // We are, or I rather, are forced to pass the name
    // onto the rhs if it is a closure to solve recursion
    rhs.cannonicalName = name
  }
  return {
    type: 'assignment',
    name,
    rhs
  }
}

function makeUnpackingAssignmentNode(unpack, rhs) {
  return {
    type: 'unpackingAssignment',
    unpack,
    rhs,
  }
}

function makeIndexAssigntNode(arrayName, index, rhs) {
  return {
    type: 'indexingAssign',
    arrayName,
    index,
    rhs
  }
}

function makeAssignment(d) {
  d = helpers.strip(d)
  if (d[0].type === 'unpack') {
    return makeUnpackingAssignmentNode(d[0], d[2])
  }
  if (d[0].type === 'arrayIndexing') {
    return makeIndexAssigntNode(d[0].name, d[0].index, d[2])
  }
  return makeBasicAssignmentNode(d[0].name, helpers.dropArray(d[2]))
}

module.exports = {
  makeAssignment,
  makeBasicAssignmentNode,
  makeUnpackingAssignmentNode,
  makeIndexAssigntNode
}
