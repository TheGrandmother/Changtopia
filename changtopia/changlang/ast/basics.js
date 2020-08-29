const helpers = require('./helpers.js')
const {h} = require('../../util/hash.js')

function makeIdentifierNode(name, dontCapture = false, pos) {
  return {
    type: 'identifier',
    name,
    dontCapture,
    pos
  }
}

function makeLabel(label) {
  return {
    type: 'label',
    label
  }
}

function makeThrowNode(atom, message, pos) {
  return {
    type: 'throw',
    atom,
    message,
    pos
  }
}

function makeIdentifier(d) {
  const pos = helpers.findPositionOfToken(d, 'IDENTIFIER')
  d = helpers.flattenAndStrip(d)
  if (!Array.isArray(d)) {
    d = [d]
  }
  return makeIdentifierNode(d[0].value, false, pos)
}

function makeBool(d) {
  const pos = helpers.findPositionOfToken(d, 'BOOL')
  return {
    type: 'constant',
    valueType: 'bool',
    value: d[0].value,
    pos
  }
}

function makeNumber(d) {
  const pos = helpers.findPositionOfToken(d, 'NUMBER')
  d = helpers.flattenAndStrip(d)
  return {
    type: 'number',
    value: d.value,
    pos: pos
  }
}

function makeReturn(d) {
  const pos = helpers.findPositionOfToken(d, 'RETURN')
  d = helpers.strip(d)
  return {
    type: 'return',
    rhs: d[1],
    pos
  }
}

function makeAtom(d) {
  const pos = helpers.findPositionOfToken(d, 'ATOM')
  d = helpers.strip(d)
  return makeAtomNode(d.value, pos)
}

function makeAtomNode(name, pos) {
  return {
    type: 'atom',
    name: name,
    value: h(name),
    pos
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
  const pos = helpers.findPositionOfToken(d, 'CHAR')
  return {
    type: 'char',
    value: unFuckEscapes(d[0].value).charCodeAt(0),
    pos
  }
}

function makeConstantNode (value, valueType, pos) {
  if (value === undefined) {
    throw new Error('Value cannot be undefined')
  }
  return {
    type: 'constant',
    valueType,
    value,
    pos
  }
}

function makeConstant(d) {
  d = helpers.flattenAndStrip(d)
  return makeConstantNode(d.value, d.type, d.pos)
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
  makeBool,
  makeLabel,
  makeThrowNode,
  makeAtomNode,
}
