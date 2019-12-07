const {inspect} = require('util')
const _log = console.log
console._log = (...args) => _log(args.map(arg => inspect(arg, false,null,true)).join(' '))

const ignoreUs = [
  ',', ';', '(', ')',
  '\n', 'spawn', 'def',
  'end', 'if', 'await',
  '->', '!', null]

function strip (arr) {
  if (typeof arr === 'object' && !Array.isArray(arr)) {
    return arr
  }
  if (arr.length === 1 && Array.isArray(arr[0])) {
    return strip(arr[0])
  } else {
    const stripped =  arr.filter(e => !ignoreUs.includes(e))
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
  console._log(strip(d))
  return strip(d)
}

function makeTuple(d) {
  d = flattenAndStrip(d)
  if (Array.isArray(d)) {
    return {type: 'tuple', vars: d}
  } else {
    return {type: 'tuple', vars: [d]}
  }
}


function annotateLog(mess) {
  return (d) =>{
    console._log(mess, d)
    return d
  }
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
      rhs: d[1]
    }
  }
}

function makeFunctionCall(d) {
  d = strip(d)
  return {
    type: 'call',
    name: d[0].name,
    args: d[1].vars,
  }
}

function makeSpawn(d) {
  d = strip(d)
  return {
    type: 'spawn',
    name: d[0].name,
    args: d[1].vars,
  }
}

function makeAwait(d) {
  d = strip(d)
  return {
    type: 'await',
    handler: d.name,
  }
}

function makeFunction(d) {
  d = strip(d)
  return {
    type: 'function',
    name: d[0].name,
    args: d[1].vars || [],
    body: d[2]
  }
}

function makeIfStatement(d) {
  d = strip(d)
  return {
    type: 'if',
    condition: d[0],
    body: d[1]
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
function log(d) {
  console._log(d)
  return d
}


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
  makeTuple,
  makeFunctionCall,
  makeSpawn,
  makeAwait,
  log,
  annotateLog
}
