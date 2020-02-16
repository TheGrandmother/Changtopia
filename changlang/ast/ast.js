const {inspect} = require('util')
const {h} = require('../../util/hash.js')
const _log = console.log
console._log = (...args) => _log(args.map(arg => inspect(arg, false,null,true)).join(' '))

const listsAndTuples = require('./listsAndTuples')
const arrays = require('./arrays')
const functions = require('./functions')
const helpers = require('./helpers')
const matcher = require('./matcher')



// TODO: All of this is an inconsistent mess. Refactor this at some point

/*
 * ==================================
 * HELPERS
 * ==================================
 */


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
  return {
    type: 'assignment',
    name: d[0].name,
    rhs: d[2],
  }
}

function makeIdentifier(d) {
  d = helpers.flattenAndStrip(d)
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
  d = helpers.flattenAndStrip(d)
  if (!Array.isArray(d)) {
    d = [d]
  }
  return {
    type: 'number',
    value: parseInt(d.join('')),
  }
}

function makeMath(d) {
  d = helpers.strip(d)
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
  d = helpers.flattenAndStrip(d)
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
  d = helpers.strip(d)
  return {
    type: 'if',
    condition: d[0],
    body: d[1]
  }
}

function makeReturn(d) {
  d = helpers.strip(d)
  return {
    type: 'return',
    rhs: d[1],
  }
}

function makeAtom(d) {
  d = helpers.strip(d)
  return {
    type: 'atom',
    name: d.name,
    value: h(d.name)
  }
}

function makeChar(d) {
  //Well do a manual strip here to handle
  //kipping of sane chars and stupid slashes
  d = d.flat()
  const c = (d[1] ? d[1] : '') + d[2]
  function unFuckEscapes(c) {
    switch (c) {
    case '\\n': return '\n'
    case '\\t': return '\t'
    case '\\r': return '\r'
    case '\\0': return '\0'
    default: return c
    }
  }
  return {
    type: 'char',
    value: unFuckEscapes(c).charCodeAt(0)
  }
}

function makeConstant(d) {
  d = helpers.flattenAndStrip(d)
  return {
    type: 'constant',
    valueType: d.type,
    value: d.value
  }
}

function makeExpr(d) {
  return helpers.dropArray(helpers.strip(d))
}

module.exports = {
  makeAssignment,
  makeIdentifier,
  makeMath,
  makeNumber,
  makeBlock,
  makeIfStatement,
  makeReturn,
  makeAtom,
  makeChar,
  makeConstant,
  makeExpr,
  ...listsAndTuples,
  ...helpers,
  ...functions,
  ...arrays,
  ...matcher
}
