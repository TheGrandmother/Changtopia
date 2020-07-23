const helpers = require('./helpers')
const basics = require('./basics.js')

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
    value: basics.makeIdentifierNode(d.value),
    pos
  }
}

function makeUnpackNode(leading, body, trailing, pos) {
  return {
    type: 'unpack',
    leading,
    body,
    trailing,
    pos
  }
}

function makeUnpack(d) {
  const pos = helpers.findPositionOfToken(d, 'BRACKET')
  d = helpers.deepStrip(d.flat().flat())
  if (Array.isArray(d)) {
    const blobIndex = d.findIndex(e => e.type === 'blob')
    if (blobIndex === -1) {
      return makeUnpackNode(d[0].entries, undefined, [], pos)
    } else {
      return makeUnpackNode(
        helpers.wrapInArray(d.slice(0, blobIndex)[0]) || [],
        d[blobIndex].value,
        helpers.wrapInArray(d.slice(blobIndex + 1)[0] || []),
        pos)
    }
  } else {
    return makeUnpackNode(d.entries, undefined, [], pos)
  }
}

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
