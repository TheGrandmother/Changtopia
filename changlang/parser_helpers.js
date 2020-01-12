const {inspect} = require('util')
const {h} = require('../util/hash.js')
const _log = console.log
console._log = (...args) => _log(args.map(arg => inspect(arg, false,null,true)).join(' '))

const ignoreUs = [
  ',', ';', '(', ')',
  '\n', 'spawn', 'def',
  'end', 'if', 'await',
  '[', ']', '|',
  '->', '!', null,
  '#', '<', '>',
  '$', '\'', '"']


// TODO: All of this is an inconsistent mess. Refactor this at some point

/*
 * ==================================
 * HELPERS
 * ==================================
 */

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

function wrapInArray(d) {
  if (d === undefined){
    return []
  } else if (!Array.isArray(d)) {
    return [d]
  } else {
    return d
  }
}

function stripAndLog(d) {
  return strip(d)
}


function skip() { return null }

function log(d) {
  console._log(d)
  return d
}

function annotateLog(mess) {
  return (d) =>{
    console._log(mess, d)
    return d
  }
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
  if (d[0].type === 'arrayIndexing') {
    return {
      type: 'indexingAssign',
      arrayName: d[0].name,
      index: d[0].index,
      rhs: d[2],
    }
  }
  return {
    type: 'assignment',
    name: d[0].name,
    rhs: d[2],
  }
}


/*
 * ==================================
 * Tuples and lists
 * ==================================
 */


function makeIdentList(d) {
  d = flattenAndStrip(d)
  return {
    type: 'identList',
    entries: wrapInArray(d)
  }
}

function makeExprList(d) {
  d = strip(d)
  return {
    type: 'exprList',
    entries: wrapInArray(d)
  }
}

function makeTuple(d) {
  d = flattenAndStrip(d)
  if (d.length === 0) {
    return {type: 'emptyTuple', body: {type: 'emptyList', entries: []}}
  } else {
    return {type: 'tuple', body: d}
  }
}

/*
 * ==================================
 * functions Stuff
 * ==================================
 */

function makeFunctionCall(d) {
  d = strip(d)
  return {
    type: 'call',
    name: d[0].name,
    args: d[1].body.entries
  }
}

function makeFunction(d) {
  d = strip(d)
  return {
    type: 'function',
    name: d[0].name,
    args: d[1].body.entries,
    body: d[2]
  }
}

/*
 * ==================================
 * Array Stuff
 * ==================================
 */

function makeArrayLitteral(d) {
  d = strip(d)
  return {
    type: 'arrayLitterall',
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

function makeUnpack(d) {
  d = strip(d)
  if (Array.isArray(d)) {
    d = d.flat()
    return {
      type: 'unpack',
      leading: wrapInArray(d[0]),
      body: d[1],
      trailing: wrapInArray(d[2])
    }
  } else {
    return {
      type: 'unpack',
      leading: d.entries,
      trailing: []
    }
  }
}

/*
 * ==================================
 * The rest
 * ==================================
 */

function makeIdentifier(d) {
  d = flattenAndStrip(d)
  if (!Array.isArray(d)) {
    d = [d]
  }

  d = d.join('')
  // THIS IS SO FUCKING UGLY
  // But i couldnt for the life of me
  // disambiguate the fokkin grammar.
  if (d === 'true') {
    return {
      type: 'constant',
      valueType: 'bool',
      value: true
    }
  } else if (d === 'false') {
    return {
      type: 'constant',
      valueType: 'bool',
      value: false
    }
  }

  return {
    type: 'identifier',
    name: d,
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

function makeAtom(d) {
  d = strip(d)
  return {
    type: 'atom',
    name: d.name,
    value: h(d.name)
  }
}

function makeChar(d) {
  d = flattenAndStrip(d)
  return {
    type: 'char',
    value: d[0].charCodeAt(0)
  }
}

function makeString(d) {
  d = strip(d)
  d = d.flat(Infinity)
  return {
    type: 'arrayLitterallImmediate',
    entries: {array: d.map(c => c.charCodeAt(0))}
  }
}

function makeConstant(d) {
  d = flattenAndStrip(d)
  return {
    type: 'constant',
    valueType: d.type,
    value: d.value
  }
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
  makeAtom,
  makeString,
  makeChar,
  makeConstant,
  log,
  annotateLog
}
