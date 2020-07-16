const helpers = require('./helpers.js')
const {h} = require('../../util/hash.js')

function makeIdentifierNode(name) {
  return {
    type: 'identifier',
    name
  }
}

function makeIdentifier(d) {
  d = helpers.flattenAndStrip(d)
  if (!Array.isArray(d)) {
    d = [d]
  }
  return makeIdentifierNode(d[0].value)
}

function makeBool(d) {
  return {
    type: 'constant',
    valueType: 'bool',
    value: d[0].value
  }
}

function makeNumber(d) {
  d = helpers.flattenAndStrip(d)
  return {
    type: 'number',
    value: d.value,
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
    name: d.value,
    value: h(d.value)
  }
}

function makeChar(d) {
  //Well do a manual strip here to handle
  //skipping of sane chars and stupid slashes
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
    value: unFuckEscapes(d[0].value).charCodeAt(0)
  }
}

function makeConstantNode (value, valueType) {
  if (value === undefined) {
    throw new Error('Value cannot be undefined')
  }
  return {
    type: 'constant',
    valueType,
    value
  }
}

function makeConstant(d) {
  d = helpers.flattenAndStrip(d)
  return makeConstantNode(d.value, d.type)
}

module.exports = {
  makeIdentifier,
  makeIdentifierNode,
  makeNumber,
  makeReturn,
  makeAtom,
  makeChar,
  makeConstant,
  makeConstantNode,
  makeBool
}
