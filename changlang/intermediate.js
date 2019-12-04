const { h } = require('../util/hash.js')

let __currentIndex = 0

function makeName(node) {
  __currentIndex += 1
  return `${node.type}_${__currentIndex}`
}

function makeInterRef(node) {
  __currentIndex += 1
  return {intermediateRef: makeName(node) + '_intermediate'}
}

function makeAssignRef(node) {
  __currentIndex += 1
  return {assignmentRef: `${makeName(node)}_${node.name}_assign`, name: node.name}
}

function makeInstruction(id, args) {
  return {instruction: {id, args}}
}

function makeLineLabel(node, name) {
  return {lineLabel: `${makeName(node)}_${name}`}
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
    const returnInterRef = makeInterRef(node)
    const rhsCode = generators[rhs.type](state, rhs, [], returnInterRef)
    const returnRef = {constant: 420}
    const myCode = [makeInstruction('ret', [returnRef])]
    return rhsCode.concat(myCode)
  },

  'identifier': (state, node, code, res) => {
    const varReference = state.refs[node.name]
    if (!varReference) {
      throw new Error(`Name ${node.name} has not been defined`)
    }
    return [{id: 'move', args: [varReference.assignmentRef, res]}]
  },

  'binop': (state, node, code, res) => {
    const resLhs = makeInterRef(node)
    const resRhs = makeInterRef(node)
    const lhsCode = generators[node.lhs.type](state, node.lhs, [], resLhs)
    const rhsCode = generators[node.rhs.type](state, node.rhs, [], resRhs)
    const myCode = [makeInstruction('op', [node.operand, resLhs, resRhs, res])]
    return code.concat(lhsCode).concat(rhsCode).concat(myCode)
    // op res_lhs res_rhs res
  },
  'if': (state, node, code) => {
    const {condition, body} = node
    const conditionRes = makeInterRef(node)
    const conditionCode = generators[condition.type](state, condition, [], conditionRes)
    const bodyCode = generators[body.type](state, body, [])
    const skipLabel = makeLineLabel(node, 'skip')
    const myCode = [makeInstruction('jump_if_true', [conditionRes, skipLabel])]
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
    // TODO: Fiddle with ret value
    const bodyCode = generators[body.type](state, body, [])
    state.functions[name] = {name, body: bodyCode, refs: state.refs}
  })
  return state.functions

}

module.exports = {
  generate
}
