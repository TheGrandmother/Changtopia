const helpers = require('./helpers')

function makeBasicAssignmentNode(name, rhs) {
  return {
    type: 'assignment',
    name,
    rhs,
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
