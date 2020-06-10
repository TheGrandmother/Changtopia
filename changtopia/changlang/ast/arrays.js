const helpers = require('./helpers')

function makeArrayLitteral(d) {
  d = helpers.flattenAndStrip(d)
  return {
    type: 'arrayLitteral',
    entries: helpers.wrapInArray(d)
  }
}

function makeArrayIndexing(d) {
  d = helpers.flattenAndStrip(d)
  return {
    type: 'arrayIndexing',
    name: d[0],
    index: d[1]
  }
}

function makeBlob(d) {
  d = helpers.strip(d)
  return {
    type: 'blob',
    value: d
  }
}

function makeUnpackNode(leading, body, trailing) {
  return {
    type: 'unpack',
    leading,
    body,
    trailing
  }
}

function makeUnpack(d) {
  d = helpers.deepStrip(d.flat().flat())
  if (Array.isArray(d)) {
    const blobIndex = d.findIndex(e => e.type === 'blob')
    if (blobIndex === -1) {
      return makeUnpackNode(d[0].entries, undefined, [])
    } else {
      return makeUnpackNode(
        helpers.wrapInArray(d.slice(0, blobIndex)[0]) || [],
        d[blobIndex].value,
        helpers.wrapInArray(d.slice(blobIndex + 1)[0] || []))
    }
  } else {
    return makeUnpackNode(d.entries, undefined, [])
  }
}

function makeString(d) {
  d = helpers.strip(d)
  d = d.flat(Infinity)
  d = d.join('')
    .replace(/\\n/g,'\n')
    .replace(/\\t/g,'\t')
    .replace(/\\r/g,'\r')
    .replace(/\\0/g,'\0')
  return {
    type: 'arrayLitterallImmediate',
    entries: {array: d.split('').map(c => c.charCodeAt(0))}
  }
}

module.exports = {
  makeArrayLitteral,
  makeArrayIndexing,
  makeBlob,
  makeUnpack,
  makeUnpackNode,
  makeString
}
