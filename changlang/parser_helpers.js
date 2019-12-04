
function strip (arr) {
  if (arr.length === 1 && Array.isArray(arr[0])) {
    return strip(arr[0])
  } else {
    const stripped =  arr.filter(e => e !== null)
    if (stripped.length === 1) {
      return stripped[0]
    } else {
      return stripped
    }
  }
}

function flattenAndStrip (arr) {
  return strip(arr.flat(Infinity))
}

function makeAssignment(d) {
  d = strip(d)
  return {
    type: 'assignment',
    name: d[0].name,
    rhs: d[2],
  }
}

function stripAndLog(d) {
  console.log(strip(d))
  return strip(d)
}

function log(d) {
  console.log(d)
  return d
}

function makeIdentifier(d) {
  d = flattenAndStrip(d)
  if (!Array.isArray(d)) {
    d = [d]
  }
  return {
    type: 'identifier',
    name: d.join(''),
  }
}

function makeNumber(d) {
  d = flattenAndStrip(d)
  if (!Array.isArray(d)) {
    d = [d]
  }
  return {
    type: 'number',
    value: parseInt(d.join('')),
  }
}

function makeMath(d) {
  d = strip(d)
  if (!Array.isArray(d)) {
    return d
  } else {
    return {
      type: 'binop',
      operand: d[1][0],
      lhs: d[0],
      rhs: d[2]
    }
  }
}

function makeBlock(d) {
  d = flattenAndStrip(d)
  if (!Array.isArray(d)) {
    return d
  } else {
    return {
      type: 'block',
      lhs: d[0],
      rhs: d[2]
    }
  }
}

function makeFunction(d) {
  d = strip(d)
  return {
    type: 'function',
    name: d[1].name,
    args: strip(d[3]),
    body: d[6]
  }
}

function makeIfStatement(d) {
  d = strip(d)
  return {
    type: 'if',
    condition: d[1],
    body: d[3]
  }
}

function makeReturn(d) {
  d = strip(d)
  return {
    type: 'return',
    rhs: d[1],
  }
}

function skip() { return null }


module.exports = {
  strip,
  makeAssignment,
  makeIdentifier,
  makeMath,
  makeNumber,
  makeBlock,
  makeFunction,
  skip,
  flattenAndStrip,
  stripAndLog,
  makeIfStatement,
  makeReturn,
  log
}
