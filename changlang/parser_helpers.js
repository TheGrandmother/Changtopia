
const strip = (arr) => arr.filter(e => e !== null)

function makeBinop(d) {
  d = strip(d)
  return {
    type: 'binop',
    value: d[1][0],
    lhs: d[0][0],
    rhs: d[2][0],
  }
}

function makeAssignment(d) {
  console.log(d)
  d = strip(d)
  return {
    type: 'assignment',
    name: d[0].name,
    rhs: d[2][0],
  }
}

function log(d) {
  console.log(d)
  return d
}

function makeIdentifier(d) {
  console.log('ident logging:', d)
  d = strip(d)
  return {
    type: 'identifier',
    name: d[0],
  }

}


module.exports = {
  strip,
  makeBinop,
  makeAssignment,
  makeIdentifier,
  log
}
