const {CompilerError} = require('../errors.js')
const {inspect} = require('util')

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

function makeAssignRef(node) {
  __currentIndex += 1
  return {ref: `${node.name}_a${__currentIndex}`, name: node.name}
}

function makeArgumentRef(name) {
  __currentIndex += 1
  return {ref: `${name}_arg${__currentIndex}`, name, arg: true}
}

function makeInstruction(id, args) {
  return {instruction: {id, args}}
}

function makeLineLabel(node, name) {
  __currentIndex += 1
  return {lineLabel: `${name}_arg${__currentIndex}_l`}
}

const _generators = {
  'assignment': (state, node) => {
    const {name, rhs} = node
    const res_subtree = makeInterRef(node)
    let assignRef = null
    if (state.refs[name]) {
      if (state.refs[name].constant) {
        throw new CompilerError(`${name} has already been decalred a constant, deal with it.`)
      }
      assignRef = state.refs[name]
    } else {
      assignRef = makeAssignRef(node)
      state.refs[name] = assignRef
    }
    const subtreeCode = generateNode(state, rhs, res_subtree)
    const myCode = [makeInstruction('move', [res_subtree, assignRef])]
    return subtreeCode.concat(myCode)
  },

  'number': (state, node, res) => {
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
    const {name, args} = node
    const argRefs = args.map(() => makeInterRef())
    const argCode = args.map((arg, i) => generateNode(state, arg, argRefs[i])).flat()
    if (!res) {
      res = DUMP
    }
    return argCode.concat([makeInstruction('call', [{constant: name}, res, ...argRefs])])
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
    const skipLabel = makeLineLabel(node, 'skip')
    const myCode = [makeInstruction('jump_if_false', [conditionRes, skipLabel])]
    return conditionCode.concat(myCode).concat(bodyCode).concat(skipLabel)
    // op res_lhs res_rhs res
  },

  'arrayLitterall': (state, node, res) => {
    const {entries} = node
    const resultLocations = entries.map(() => makeInterRef())
    const valueCodes = entries.map((entry, i) => generateNode(state, entry, resultLocations[i]))
    const myCode = [makeInstruction('arrayCreate', [res, ...resultLocations])]
    return valueCodes.flat().concat(myCode)
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

  'unpack': (state, node, res) => {
    const {name, index} = node
    const arrayRef = state.refs[name.name]
    const indexRef = makeInterRef()
    const indexCode = generateNode(state, index, indexRef)
    if (!arrayRef) {
      throw new CompilerError(`Name ${node.name} has not been defined`)
    }
    return indexCode.concat([makeInstruction('arrayIndexGet', [arrayRef, indexRef, res])])
  },

  'block': (state, node) => {
    const lhsCode = generateNode(state, node.lhs)
    const rhsCode = generateNode(state, node.rhs)
    return lhsCode.concat(rhsCode)
  },
}

function wrapGenerators() {
  const generators = {}
  Object.keys(_generators).forEach(key => {
    generators[key] = (state, node, ...args) => {
      try {
        return _generators[key](state, node, ...args)
      } catch (err) {
        throw new CompilerError(`I encountered the error:\n${err.name}: \n${err.message}\n` +
                                `Whilst trying to generate the code for:\n${inspect(node,false,null,true)}`)
      }
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

function generate(funcs) {
  const state = {
    functions: {},
    refs: {},
    labels: {}
  }

  funcs.forEach((func) => {
    const {name, body, args} = func

    if (state.functions[name]) {
      throw new Error(`A function named ${name} has already been defined`)
    }
    state.refs = {}
    funcs.forEach(({name}) => state.refs[name] = {constant: name})
    state.labels = {}
    Object.values(args).forEach(argument => {
      state.refs[argument.name] = makeArgumentRef(argument.name)
    })
    state.returnRef = {constant: '__return__'}

    const bodyCode = generators[body.type](state, body)

    const argLocations = Object.values(state.refs).filter(({arg}) => arg).map(({ref}) => ref)

    state.functions[name] = {name, body: bodyCode, refs: state.refs, argLocations}
  })
  return state.functions
}

module.exports = {
  generate
}
