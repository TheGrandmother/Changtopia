const helpers = require('./helpers')

function makeFunctionCallNode(name, args, module=false, pos) {
  return {
    type: 'call',
    name,
    args,
    module,
    pos
  }
}

function makeFunctionCall(d) {
  d = helpers.deepStrip(d)
  let module = false
  if (d.length === 3) {
    module = d[0][0].name
    d = d.slice(1)
  }
  return makeFunctionCallNode(d[0].name, d[1].body.entries, module, d[0].pos)
}

function makeFunctionNode(name, args, body, pos, matchyBoi = false) {
  return{
    type: 'function',
    name,
    args,
    body,
    pos,
    matchyBoi
  }
}

function makeFunction(d) {
  const position = helpers.findPositionOfToken(d, 'DEF')
  d = helpers.deepStrip(d)
  return makeFunctionNode(d[0].name, d[1].body.entries, helpers.dropArray(d[2]), position)
}

function makeClosure(d) {
  const pos = helpers.findPositionOfToken(d, 'DEF')
  d = helpers.flattenAndStrip(d)
  return makeClosureNode(d[0], helpers.dropArray(d[1]), pos)
}

function makeClosureNode(args, body, pos) {
  return {
    type: 'closure',
    args: args.body.entries,
    body,
    unbound: identifyUnbound(args.body.entries.map(e => e.name), body),
    pos
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
      if (node.unpack.body) {
        node.unpack.body.type === 'blob' ? boundByMe.push(node.unpack.body.value.name) : boundByMe.push(node.unpack.body.name)
      }
    }

    if (node.type && node.type === 'identifier') {
      if (!node.dontCapture && !argNames.includes(node.name) && !boundByMe.includes(node.name)) {
        unbound[node.name] = null
        return
      }
    }

    if (node.type === 'blob') {
      traverse(node.value)
    }

    if (node.type === 'closure') {
      node.args.forEach(a => boundByMe.push(a.name))
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

function makeModule(d) {
  d = helpers.strip(d)
  return {
    type: 'module',
    moduleName: d[1].name
  }
}

function makeRefferenceCallNode(identifier, args, pos) {
  return makeFunctionCallNode('run', [identifier, ...args], 'core', pos)
}

function makeRefferenceCall(d) {
  const pos = helpers.findPositionOfToken(d, 'REF_CALL')
  d = helpers.deepStrip(d)
  return makeRefferenceCallNode(d[0], d[1].body.entries, pos)
}

module.exports = {
  makeRefferenceCall,
  makeRefferenceCallNode,
  makeFunctionCall,
  makeFunctionCallNode,
  makeFunctionNode,
  makeFunction,
  makeModule,
  makeClosure
}
