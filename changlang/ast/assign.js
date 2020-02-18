const helpers = require('./helpers')

function makeBasicAssignmentNode(name, rhs) {
  return {
    type: 'assignment',
    name,
    rhs,
  }
}

function makeAssignment(d) {
  d = helpers.strip(d)
  if (d[0].type === 'unpack') {
    return {
      type: 'unpackingAssignment',
      unpack: d[0],
      rhs: d[2],
    }
  }
  if (d[0].type === 'arrayIndexing') {
    return {
      type: 'indexingAssign',
      arrayName: d[0].name,
      index: d[0].index,
      rhs: d[2],
    }
  }
  return makeBasicAssignmentNode(d[0].name, d[2])
}

module.exports = {
  makeAssignment,
  makeBasicAssignmentNode
}
