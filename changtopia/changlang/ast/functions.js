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

function makeClosureNode(args, body) {
  return {
    type: 'closure',
    args: args.body.entries,
    body,
    unbound: identifyUnbound(args.body.entries.map(e => e.name), body)
  }
}

function identifyUnbound(argNames, body) {
  const unbound = {}
  const boundByMe = []
  function traverse(node) {
    if (!node) {
      return
    }

    if (node.type === 'assignment') {
      boundByMe.push(node.name)
    }

    if (node.type === 'unpackingAssignment') {
      node.unpack.leading.forEach(e => boundByMe.push(e.name))
      node.unpack.trailing.forEach(e => boundByMe.push(e.name))
      node.unpack.body && boundByMe.push(node.unpack.body.name)
    }

    if (node.type && node.type === 'identifier') {
      if (!node.autoGenerated && !argNames.includes(node.name) && !boundByMe.includes(node.name)) {
        unbound[node.name] = null
        return
      }
    }
    node.lhs && node.type !== 'assignemnt' && traverse(node.lhs)
    node.rhs && traverse(node.rhs)
    node.body && traverse(node.body)
    node.args && node.args.forEach(a => traverse(a))
    node.entries && !node.entries.array && node.entries.forEach(e => traverse(e))
  }
  traverse(body)
  return Object.keys(unbound)

}

function makeClosure(d) {
  d = helpers.strip(d)
  return makeClosureNode(d[0], helpers.dropArray(d[1]))
}

function makeModule(d) {
  d = helpers.strip(d)
  return {
    type: 'module',
    moduleName: d[0].name
  }
}

function makeRefferenceCallNode(identifier, args) {
  return makeFunctionCallNode('run', [identifier, ...args], 'bif')
}

function makeRefferenceCall(d) {
  d = helpers.deepStrip(d)
  return makeRefferenceCallNode(d[0], d[1].body.entries)
}

module.exports = {
  makeRefferenceCall,
  makeRefferenceCallNode,
  makeFunctionCall,
  makeFunctionCallNode,
  makeFunction,
  makeModule,
  makeClosure
}
