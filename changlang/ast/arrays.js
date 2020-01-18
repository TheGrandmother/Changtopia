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

function makeUnpack(d) {
  d = helpers.deepStrip(d.flat().flat())
  if (Array.isArray(d)) {
    d = d.flat()
    return {
      type: 'unpack',
      leading: helpers.wrapInArray(d[0]),
      body: d[1].value,
      trailing: helpers.wrapInArray(d[2])
    }
  } else {
    return {
      type: 'unpack',
      leading: d.entries,
      trailing: []
    }
  }
}

function makeString(d) {
  d = helpers.strip(d)
  d = d.flat(Infinity)
  return {
    type: 'arrayLitterallImmediate',
    entries: {array: d.map(c => c.charCodeAt(0))}
  }
}

module.exports = {
  makeArrayLitteral,
  makeArrayIndexing,
  makeBlob,
  makeUnpack,
  makeString
}
