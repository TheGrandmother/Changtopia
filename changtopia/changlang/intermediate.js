const {CompilerError} = require('../errors.js')
const {inspect} = require('util')
const {fromJsString} = require('../util/strings.js')
const {h} = require('../util/hash.js')

const _inspect = (obj) => inspect(obj,false,null,true) /* eslint-disable-line */

const DUMP = {constant: '__dump__'}

let __currentIndex = 0

function makeName() {
  __currentIndex += 1
  return `${__currentIndex}`
}

function makeInterRef(node) {
  __currentIndex += 1
  return {ref: `i${makeName(node)}`}
}

function makeAssignRef(name) {
  __currentIndex += 1
  return {ref: `${name}_a${__currentIndex}`, name: name}
}

function makeArgumentRef(name, order) {
  __currentIndex += 1
  return {ref: `${name}_arg${__currentIndex}`, name, arg: true, order}
}

function makeUniqueLineLabel(name) {
  __currentIndex += 1
  return {lineLabel: `${name}_l${__currentIndex}`}
}

function makeClosureName(module, cannonicalName) {
  __currentIndex += 1
  return `${module}_${cannonicalName}_c${__currentIndex}`
}

function makeLineLabel(name) {
  return {lineLabel: `${name}`}
}

function makeInstruction(id, args, pos) {
  return {instruction: {id, args, pos}}
}

function createAssignment(state, name) {
  let assignRef = null
  if (state.refs[name]) {
    if (state.refs[name].constant) {
      throw new CompilerError(`${name} has already been decalred a constant, deal with it.`)
    }
    assignRef = state.refs[name]
  } else {
    assignRef = makeAssignRef(name)
    state.refs[name] = assignRef
  }
  return assignRef

}

function getRef(state, name) {
  const varReference = state.refs[name]
  if (!varReference) {
    throw new CompilerError(`Name ${name} has not been defined`)
  } else {
    return varReference.ref
  }
}

const _generators = {
  'assignment': (state, node) => {
    const {name, rhs} = node
    const res_subtree = makeInterRef(node)
    const assignRef = createAssignment(state, name)
    const subtreeCode = generateNode(state, rhs, res_subtree)
    const myCode = [makeInstruction('move', [res_subtree, assignRef], node.pos)]
    return subtreeCode.concat(myCode)
  },

  'constant': (state, node, res) => {
    return [makeInstruction('imove',[{constant: node.value}, res], node.pos)]
  },

  'return': (state, node) => {
    const {rhs} = node
    const rhsCode = generateNode(state, rhs, state.returnRef)
    const myCode = [makeInstruction('return', [state.returnRef], node.pos)]
    return rhsCode.concat(myCode)
  },

  'identifier': (state, node, res) => {
    const varReference = state.refs[node.name]
    if (!varReference) {
      throw new CompilerError(`Name ${node.name} has not been defined`)
    } else {
      if (varReference.constant) {
        return [makeInstruction('imove', [varReference, res], node.pos)]
      } else {
        return [makeInstruction('move', [varReference, res], node.pos)]
      }
    }
  },

  'call': (state, node, res) => {
    const {name, args, module} = node
    const argRefs = args.map(() => makeInterRef())
    const argCode = args.map((arg, i) => generateNode(state, arg, argRefs[i])).flat()
    if (!res) {
      res = DUMP
    }
    return argCode.concat([makeInstruction('call', [{constant: module || state.moduleName}, {constant: name}, res, ...argRefs], node.pos)])
  },

  'binop': (state, node, res) => {
    const resLhs = makeInterRef(node)
    const resRhs = makeInterRef(node)
    const lhsCode = generateNode(state, node.lhs, resLhs)
    const rhsCode = generateNode(state, node.rhs, resRhs)
    const myCode = [makeInstruction('op', [{constant: node.operand}, res, resLhs, resRhs], node.pos)]
    return lhsCode.concat(rhsCode).concat(myCode)
    // op res_lhs res_rhs res
  },

  'if': (state, node) => {
    const {lhs, rhs} = node
    const conditionRes = makeInterRef(node)
    const conditionCode = generateNode(state, lhs, conditionRes)
    const bodyCode = generateNode(state, rhs)
    const skipLabel = makeUniqueLineLabel('skip')
    const myCode = [makeInstruction('jump_if_false', [conditionRes, skipLabel], node.pos)]
    return conditionCode.concat(myCode).concat(bodyCode).concat(skipLabel)
    // op res_lhs res_rhs res
  },

  '__arrayLitterall': (state, node, res) => {
    const {entries} = node
    const resultLocations = entries.map(() => makeInterRef())
    const valueCodes = entries.map((entry, i) => generateNode(state, entry, resultLocations[i]))
    const myCode = [makeInstruction('arrayCreate', [res, ...resultLocations], node.pos)]
    return valueCodes.flat().concat(myCode)
  },

  'jump': (state, node) => {
    const {label} = node
    return [makeInstruction('jump', [makeLineLabel(label)], node.pos)]
  },

  'arrayLitterallImmediate': (state, node, res) => {
    const {entries} = node
    const myCode = [makeInstruction('arrayCreateImmediate', [res, entries], node.pos)]
    return myCode
  },

  'arrayIndexing': (state, node, res) => {
    const {name, index} = node
    const arrayRef = state.refs[name.name]
    const indexRef = makeInterRef()
    const indexCode = generateNode(state, index, indexRef)
    if (!arrayRef) {
      throw new CompilerError(`Name ${node.name} has not been defined`)
    }
    return indexCode.concat([makeInstruction('arrayIndexGet', [arrayRef, indexRef, res], node.pos)])
  },

  'arrayLitteral': (state, node, res) => {
    const entries = node.entries

    const blobs = entries.map((e, i) => {
      if (e.type === 'blob') {
        return {ref: {ref: getRef(state, e.value.name)}, index: i}
      }
    }).filter(e => e)

    const normalEntries = entries.map((e, i) => {
      if (e.type !== 'blob') {
        return {node: e, index: i, ref: makeInterRef()}
      }
    }).filter(e => e)
    const entryCode = normalEntries.reduce((acc, e) => acc.concat(generateNode(state, e.node, e.ref)),[])
    const entryRefs = []
    blobs.forEach(blob => entryRefs[blob.index] = blob.ref)
    normalEntries.forEach(entry => entryRefs[entry.index] = entry.ref)
    const blobCount = {constant: blobs.length}
    const blobIndexes = blobs.map(blob => ({constant: blob.index}))
    return entryCode.concat([makeInstruction('arrayCreate', [res, blobCount, ...blobIndexes, ...entryRefs], node.pos)])
  },

  'indexingAssign': (state, node) => {
    const {arrayName, index, rhs} = node
    const rhsRes = makeInterRef()
    const rhsCode = generateNode(state, rhs, rhsRes)
    const arrayRef = state.refs[arrayName.name]
    if (!arrayRef) {
      throw new CompilerError(`Name ${node.name} has not been defined`)
    }
    const indexRef = makeInterRef()
    const indexCode = generateNode(state, index, indexRef)
    return indexCode.concat(rhsCode).concat([makeInstruction('arrayIndexAssign', [arrayRef, indexRef, rhsRes], node.pos)])
  },

  'unpackingAssignment': (state, node) => {
    const {rhs, unpack} = node
    const {leading, body, trailing} = unpack
    const rhsRes = makeInterRef()
    const rhsCode = generateNode(state, rhs, rhsRes)
    const leadingRefs = leading.map(({name}) => createAssignment(state, name))
    const trailingRefs = trailing.map(({name}) => createAssignment(state, name))
    const bodyRef = body && createAssignment(state, body.name || body.value.name)
    const args = [
      rhsRes,
      {constant: !!body},
      {constant: leadingRefs.length},
      {constant: trailingRefs.length},
      ...leadingRefs,
      ...trailingRefs,
    ]
    body && args.push(bodyRef)
    return rhsCode.concat([makeInstruction('arrayUnpack', args, node.pos)])
  },

  'block': (state, node) => {
    const {rhs, lhs, doneLabel} = node
    const lhsCode = generateNode(state, lhs)
    const rhsCode = generateNode(state, rhs)
    if (!doneLabel) {
      return lhsCode.concat(rhsCode)
    } else {
      return lhsCode.concat(rhsCode).concat([makeLineLabel(doneLabel)])
    }
  },

  'closure': (state, node, res) => {
    const {unbound, cannonicalName} = node
    const name = makeClosureName(state.moduleName, cannonicalName)
    const unboundRefs = unbound.map(name => ({ref: getRef(state, name), name}))
    generateFunction({...state, refs: {}, labels: {}}, {...node, name, unbound: unboundRefs})
    const moduleRef = makeInterRef()
    const nameRef = makeInterRef()
    const selfRef = makeInterRef()
    const bindingRefs = unboundRefs.map(ref => ref.name === cannonicalName ? selfRef : ref)
    return [
      makeInstruction('imove',[{constant: h('__SELF__')}, selfRef], node.pos),
      makeInstruction('arrayCreateImmediate', [moduleRef, {array: fromJsString(state.moduleName)}], node.pos),
      makeInstruction('arrayCreateImmediate', [nameRef, {array: fromJsString(name)}], node.pos),
      makeInstruction('arrayCreate', [res, {constant: 0}, moduleRef, nameRef, ...bindingRefs], node.pos)
    ]
  },
}

function wrapGenerators() {
  const generators = {}
  Object.keys(_generators).forEach(key => {
    generators[key] = (state, node, ...args) => {
      return _generators[key](state, node, ...args)
    }
  })
  return generators
}

const generators = wrapGenerators()

function generateNode(state, node, res) {
  try {
    if (!generators[node.type]) {
      throw new CompilerError(`Unfortunatley I dont know what the hell to do with a node of type: '${node.type}'`)
    }
    return generators[node.type](state, node, res)
  } catch (err) {
    if (!err.tagged) {
      if (node.pos) {
        err.message = `L:${node.pos.line} C:${node.pos.col} : ${err.message}`
      }
      err.position = node.pos
      err.nodeType = node.type
      err.tagged = true
    }
    throw err
  }
}

function generateFunction(state, func) {
  const {name, body, args, unbound} = func
  state.currentFunction = name

  if (state.functions[name]) {
    throw new Error(`A function named ${name} has already been defined`)
  }
  state.refs = {}
  state.labels = {}
  Object.values(args).forEach((argument, i) => {
    state.refs[argument.name] = makeArgumentRef(argument.name, i)
  })

  unbound && Object.values(unbound).forEach(ref => {
    state.refs[ref.name] = ref
  })

  state.returnRef = {ref: '__return__'}

  if (!generators[body.type]) {
    throw new CompilerError(`I dont know what to do with a ${body.type} node`)
  }

  let bodyCode = generators[body.type](state, body)
  if (func.entryLabel) {
    bodyCode = [makeLineLabel(func.entryLabel), ...bodyCode]
  }

  const argLocations = Object.values(state.refs).filter(({arg}) => arg).map(({ref}) => ref)

  state.functions[name] = {name, body: bodyCode, refs: state.refs, argLocations, unbound: unbound && unbound.map(({ref}) => ref)}
}

function generateIntermediateCode(ast) {
  const state = {
    functions: {},
    refs: {},
    labels: {},
    moduleName: ''
  }

  const functions = []

  ast.forEach((topNode) => {
    if (topNode.type === 'function') {
      functions.push(topNode)
    }

    if (topNode.type === 'module') {
      state.moduleName = topNode.moduleName
    }
  })

  functions.forEach(f => generateFunction(state, f))

  return {
    moduleName: state.moduleName,
    functions: state.functions,
  }
}

module.exports = {
  generateIntermediateCode
}
