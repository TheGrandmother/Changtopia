const helpers = require('./helpers')
const basics = require('./basics.js')
const assign = require('./assign.js')
const {randomHash} = require('../../util/hash.js')
const {CompilerError} = require('../../errors.js')

function makeArrayLitteral(d) {
  const pos = helpers.findPositionOfToken(d, 'BRACKET')
  d = helpers.flattenAndStrip(d)
  return {
    type: 'arrayLitteral',
    entries: helpers.wrapInArray(d),
    pos
  }
}

function makeBlob(d) {
  const pos = helpers.findPositionOfToken(d, 'BLOB')
  d = helpers.strip(d)
  return {
    type: 'blob',
    value: basics.makeIdentifierNode(d.value, pos),
    pos
  }
}

function makeUnpackNode(leading, body, trailing, pos, subPatterns) {

  return {
    type: 'unpack',
    leading,
    body,
    trailing,
    pos,
    subPatterns
  }
}

function makeUnpack(d) {
  const pos = helpers.findPositionOfToken(d, 'BRACKET')
  d = helpers.deepStrip(d.flat(Infinity))
  const leading = []
  const trailing = []
  let body = undefined
  const subPatterns = []
  d.forEach(node => {
    if (node.type === 'unpack') {
      //suffer
      const ident = basics.makeIdentifierNode(`sub_pattern_${randomHash()}`, true, node.pos)
      if (!body) {
        leading.push(ident)
      } else {
        leading.push(trailing)
      }
      const subNode = assign.makeUnpackingAssignmentNode(node, ident, node.pos)
      subPatterns.push(subNode)
    } else if (node.type === 'blob') {
      if (body) {
        throw new CompilerError(`Multiple blobs in unpacking pattern at line ${pos.line} col ${pos.col}`, pos)
      }
      body = node.value
    } else if (!body) {
      leading.push(node)
    } else {
      trailing.push(node)
    }
  })
  return makeUnpackNode(leading, body, trailing, pos, subPatterns)
}

//function _makeUnpack(d) {
//  const pos = helpers.findPositionOfToken(d, 'BRACKET')
//  d = helpers.deepStrip(d.flat(Infinity))
//  console.log('=======')
//  helpers.log(d)
//  if (Array.isArray(d)) {
//    const blobIndex = d.findIndex(e => e.type === 'blob')
//    if (blobIndex === -1) {
//      return makeUnpackNode(d[0], undefined, [], pos)
//    } else {
//      return makeUnpackNode(
//        helpers.wrapInArray(d.slice(0, blobIndex)[0]) || [],
//        d[blobIndex].value,
//        helpers.wrapInArray(d.slice(blobIndex + 1)[0] || []),
//        pos)
//    }
//  } else {
//    return makeUnpackNode(d, undefined, [], pos)
//  }
//}

function makeString(d) {
  const pos = helpers.findPositionOfToken(d, 'STRING')
  d = helpers.strip(d)
  const s = d.value
    .replace(/\\n/g,'\n')
    .replace(/\\t/g,'\t')
    .replace(/\\r/g,'\r')
    .replace(/\\0/g,'\0')
  return {
    type: 'arrayLitterallImmediate',
    entries: {array: s.split('').map(c => c.charCodeAt(0))}, 
    pos
  }
}

module.exports = {
  makeArrayLitteral,
  makeBlob,
  makeUnpack,
  makeUnpackNode,
  makeString
}
