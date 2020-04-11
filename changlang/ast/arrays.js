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
    d = d.flat()
    return makeUnpackNode(helpers.wrapInArray(d[0]), d[1].value, helpers.wrapInArray(d[2]))
  } else {
    return makeUnpackNode(d.entries, undefined, [])
  }
}

function makeString(d) {
  d = helpers.strip(d)
  d = d.flat(Infinity)
  function unFuckEscapes(c) {
    switch (c) {
    case '\\n': return '\n'
    case '\\t': return '\t'
    case '\\r': return '\r'
    case '\\0': return '\0'
    default: return c
    }
  }
  d = d.join('')
    .replace('\\n','\n')
    .replace('\\t','\t')
    .replace('\\r','\r')
    .replace('\\0','\0')
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
