const helpers = require('./helpers')

function makeFunctionCall(d) {
  d = helpers.deepStrip(d)
  let module = false
  if (d.length === 3) {
    module = d[0][0].name
    d = d.slice(1)
  }
  return {
    type: 'call',
    name: d[0].name,
    args: d[1].body.entries,
    module
  }
}

function makeFunction(d) {
  d = helpers.strip(d)
  return {
    type: 'function',
    name: d[0].name,
    args: d[1].body.entries,
    body: d[2]
  }
}

function makeModule(d) {
  d = helpers.strip(d)
  return {
    type: 'module',
    moduleName: d[0].name
  }
}

module.exports = {
  makeFunctionCall,
  makeFunction,
  makeModule
}
