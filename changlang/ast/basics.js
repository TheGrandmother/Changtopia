const helpers = require('./helpers.js')
const {h} = require('../../util/hash.js')

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
  //skipping of sane chars and stupid slashes
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

function makeConstantNode (value, valueType) {
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
  makeNumber,
  makeIfStatement,
  makeReturn,
  makeAtom,
  makeChar,
  makeConstant,
  makeConstantNode
}
