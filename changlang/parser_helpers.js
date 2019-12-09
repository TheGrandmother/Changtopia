const {inspect} = require('util')
const _log = console.log
console._log = (...args) => _log(args.map(arg => inspect(arg, false,null,true)).join(' '))

const ignoreUs = [
  ',', ';', '(', ')',
  '\n', 'spawn', 'def',
  'end', 'if', 'await',
  '[', ']', '|',
  '->', '!', null,
  '#', '<', '>']

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
  if (d[0].type === 'unpack') {
    return {
      type: 'unpackingAssignment',
      unpack: d[0],
      rhs: d[2],
    }
  }
  return {
    type: 'assignment',
    name: d[0].name,
    rhs: d[2],
  }
}

function stripAndLog(d) {
  return strip(d)
}

function makeTuple(d) {
  d = flattenAndStrip(d)
  return {type: 'tuple', entries: d}
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

function makeArrayLitteral(d) {
  d = strip(d)
  return {
    type: 'array',
    entries: d.entries
  }
}

function makeArrayIndexing(d) {
  d = strip(d)
  return {
    type: 'arrayIndexing',
    name: d[0],
    index: d[1]
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
    args: d[1].entries,
  }
}

function makeFunction(d) {
  d = strip(d)
  return {
    type: 'function',
    name: d[0].name,
    args: d[1].entries || [],
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

function makeIdentList(d) {
  d = flattenAndStrip(d)
  return {
    type: 'identList',
    entries: d
  }
}

function makeExprList(d) {
  d = flattenAndStrip(d)
  return {
    type: 'exprList',
    entries: d
  }
}

function makeUnpack(d) {
  d = strip(d)
  d = d.flat()
  return {
    type: 'unpack',
    lhs: d[0],
    middle: d[1],
    rhs: d[2]
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
  makeUnpack,
  makeIdentList,
  makeExprList,
  makeArrayLitteral,
  makeArrayIndexing,
  log,
  annotateLog
}
