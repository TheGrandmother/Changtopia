const {CompilerError} = require('../errors.js')
const {inspect} = require('util')

const _inspect = (obj) => inspect(obj,false,null,true) /* eslint-disable-line */

const DUMP = {constant: '__dump__'}

let __currentIndex = 0

function makeName() {
  __currentIndex += 1
  return `${__currentIndex}`
}

function makeInterRef(node) {
  __currentIndex += 1
  return {ref: makeName(node) + '_i'}
}

function makeAssignRef(name) {
  __currentIndex += 1
  return {ref: `${name}_a${__currentIndex}`, name: name}
}

function makeArgumentRef(name, order) {
  __currentIndex += 1
  return {ref: `${name}_arg${__currentIndex}`, name, arg: true, order}
}

function makeInstruction(id, args) {
  return {instruction: {id, args}}
}

function makeUniqueLineLabel(name) {
  __currentIndex += 1
  return {lineLabel: `${name}_arg${__currentIndex}_l`}
}

function makeLineLabel(name) {
  return {lineLabel: `${name}`}
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
    const myCode = [makeInstruction('move', [res_subtree, assignRef])]
    return subtreeCode.concat(myCode)
  },

  'constant': (state, node, res) => {
    return [makeInstruction('imove',[{constant: node.value}, res])]
  },

  'return': (state, node) => {
    const {rhs} = node
    const rhsCode = generateNode(state, rhs, state.returnRef)
    const myCode = [makeInstruction('return', [state.returnRef])]
    return rhsCode.concat(myCode)
  },

  'identifier': (state, node, res) => {
    const varReference = state.refs[node.name]
    if (!varReference) {
      throw new CompilerError(`Name ${node.name} has not been defined`)
    } else {
      if (varReference.constant) {
        return [makeInstruction('imove', [varReference, res])]
      } else {
        return [makeInstruction('move', [varReference, res])]
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
    return argCode.concat([makeInstruction('call', [{constant: module || state.moduleName}, {constant: name}, res, ...argRefs])])
  },

  'spawn': (state, node, res) => {
    const {name, args} = node
    const argRefs = args.map(() => makeInterRef())
    const argCode = args.map((arg, i) => generateNode(state, arg, argRefs[i])).flat()
    return argCode.concat([makeInstruction('spawn', [{constant: name}, res, ...argRefs])])
  },

  'await': (state, node) => {
    const {handler} = node
    return [makeInstruction('await', [{constant: handler}])]
  },

  'binop': (state, node, res) => {
    const resLhs = makeInterRef(node)
    const resRhs = makeInterRef(node)
    const lhsCode = generateNode(state, node.lhs, resLhs)
    const rhsCode = generateNode(state, node.rhs, resRhs)
    const myCode = [makeInstruction('op', [{constant: node.operand}, resLhs, resRhs, res])]
    return lhsCode.concat(rhsCode).concat(myCode)
    // op res_lhs res_rhs res
  },

  'if': (state, node) => {
    const {condition, body} = node
    const conditionRes = makeInterRef(node)
    const conditionCode = generateNode(state, condition, conditionRes)
    const bodyCode = generateNode(state, body)
    const skipLabel = makeUniqueLineLabel('skip')
    const myCode = [makeInstruction('jump_if_false', [conditionRes, skipLabel])]
    return conditionCode.concat(myCode).concat(bodyCode).concat(skipLabel)
    // op res_lhs res_rhs res
  },

  '__arrayLitterall': (state, node, res) => {
    const {entries} = node
    const resultLocations = entries.map(() => makeInterRef())
    const valueCodes = entries.map((entry, i) => generateNode(state, entry, resultLocations[i]))
    const myCode = [makeInstruction('arrayCreate', [res, ...resultLocations])]
    return valueCodes.flat().concat(myCode)
  },

  'jump': (state, node) => {
    const {label} = node
    return [makeInstruction('jump', [makeLineLabel(label)])]
  },

  'arrayLitterallImmediate': (state, node, res) => {
    const {entries} = node
    const myCode = [makeInstruction('arrayCreateImmediate', [res, entries])]
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
    return indexCode.concat([makeInstruction('arrayIndexGet', [arrayRef, indexRef, res])])
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
    return entryCode.concat([makeInstruction('arrayCreate', [res, blobCount, ...blobIndexes, ...entryRefs])])
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
    return indexCode.concat(rhsCode).concat([makeInstruction('arrayIndexAssign', [arrayRef, indexRef, rhsRes])])
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
    return rhsCode.concat([makeInstruction('arrayUnpack', args)])
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
  if (!generators[node.type]) {
    throw new CompilerError(`Unfortunatley I dont know what the hell to do with ${inspect(node)}`)
  }
  return generators[node.type](state, node, res)
}

function generateIntermediateCode(ast) {
  const state = {
    imports: {},
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



  functions.forEach((func) => {
    const {name, body, args} = func

    if (state.functions[name]) {
      throw new Error(`A function named ${name} has already been defined`)
    }
    state.refs = {}
    state.labels = {}
    Object.values(args).forEach((argument, i) => {
      state.refs[argument.name] = makeArgumentRef(argument.name, i)
    })
    state.returnRef = {constant: '__return__'}

    if (!generators[body.type]) {
      console.log(body)
      console.log(body.type)
      throw new CompilerError(`I dont know what to do with a ${body.type} node`)
    }
    const bodyCode = generators[body.type](state, body)

    const argLocations = Object.values(state.refs).filter(({arg}) => arg).map(({ref}) => ref)

    state.functions[name] = {name, body: bodyCode, refs: state.refs, argLocations}
  })

  return {
    moduleName: state.moduleName,
    functions: state.functions,
  }
}

module.exports = {
  generateIntermediateCode
}
