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
  return {ref: `${name}_arg${__currentIndex}`, name}
}

function makeInstruction(id, args) {
  return {instruction: {id, args}}
}

function makeLineLabel(node, name) {
  return {lineLabel: `${name}_l`}
}

const generators = {
  'assignment': (state, node, code) => {
    const {name, rhs} = node
    const res_subtree = makeInterRef(node)
    let assignRef = null
    if (state.refs[name]) {
      assignRef = state.refs[name]
    } else {
      assignRef = makeAssignRef(node)
      state.refs[name] = assignRef
    }
    const subtreeCode = generators[rhs.type](state, rhs, [], res_subtree)
    const myCode = [makeInstruction('move', [res_subtree, assignRef])]
    return code.concat(subtreeCode).concat(myCode)
  },

  'number': (state, node, code, res) => {
    return [makeInstruction('imove',[{constant: node.value}, res])]
  },

  'return': (state, node) => {
    const {rhs} = node
    const rhsCode = generators[rhs.type](state, rhs, [], state.returnRef)
    const myCode = [makeInstruction('return', [state.returnRef])]
    return rhsCode.concat(myCode)
  },

  'identifier': (state, node, code, res) => {
    const varReference = state.refs[node.name]
    if (!varReference) {
      throw new Error(`Name ${node.name} has not been defined`)
    }
    return [makeInstruction('move', [varReference, res])]
  },

  'binop': (state, node, code, res) => {
    const resLhs = makeInterRef(node)
    const resRhs = makeInterRef(node)
    const lhsCode = generators[node.lhs.type](state, node.lhs, [], resLhs)
    const rhsCode = generators[node.rhs.type](state, node.rhs, [], resRhs)
    console.log('res lhs:', resLhs)
    console.log('res rhs:', resRhs)
    const myCode = [makeInstruction('op', [{constant: node.operand}, resLhs, resRhs, res])]
    return code.concat(lhsCode).concat(rhsCode).concat(myCode)
    // op res_lhs res_rhs res
  },
  'if': (state, node, code) => {
    const {condition, body} = node
    const conditionRes = makeInterRef(node)
    const conditionCode = generators[condition.type](state, condition, [], conditionRes)
    const bodyCode = generators[body.type](state, body, [])
    const skipLabel = makeLineLabel(node, 'skip')
    const myCode = [makeInstruction('jump_if_false', [conditionRes, skipLabel])]
    return code.concat(conditionCode).concat(myCode).concat(bodyCode).concat(skipLabel)
    // op res_lhs res_rhs res
  },

  'block': (state, node, code) => {
    const lhsCode = generators[node.lhs.type](state, node.lhs, code)
    const rhsCode = generators[node.rhs.type](state, node.rhs, code)
    return code.concat(lhsCode).concat(rhsCode)
  },

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
    state.labels = {}
    // TODO: Fiddle with args
    Object.values(args).forEach(argument => {
      state.refs[argument.name] = makeArgumentRef(argument.name)
    })
    console.log(state.refs)
    state.returnRef = {constant: '__return__'}
    const bodyCode = generators[body.type](state, body, [])
    state.functions[name] = {name, body: bodyCode, refs: state.refs}
  })
  return state.functions
}

module.exports = {
  generate
}
