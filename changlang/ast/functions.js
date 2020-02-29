const helpers = require('./helpers')

function makeFunctionCallNode(name, args, module=false) {
  return {
    type: 'call',
    name,
    args,
    module
  }
}

function makeFunctionCall(d) {
  d = helpers.deepStrip(d)
  let module = false
  if (d.length === 3) {
    module = d[0][0].name
    d = d.slice(1)
  }
  return makeFunctionCallNode(d[0].name, d[1].body.entries, module)
}

function makeFunction(d) {
  d = helpers.strip(d)
  return {
    type: 'function',
    name: d[0].name,
    args: d[1].body.entries,
    body: helpers.dropArray(d[2])
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
  makeFunctionCallNode,
  makeFunction,
  makeModule
}
