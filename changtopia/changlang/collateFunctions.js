const {makeFunctionNode} = require('./ast/functions.js')
const {makeIdentifierNode, makeThrowNode, makeConstantNode} = require('./ast/basics.js')
const {makeClauseNode, makeMatcherNode} = require('./ast/matcher.js')
const {makeArrayLitteralNode, makeStringNode} = require('./ast/arrays.js')
const {h} = require('../util/hash.js')

function combine(functions) {
  if (functions.length === 1) {
    return functions[0]
  }
  const theGodArgument = makeIdentifierNode('__the_god_argument', false, functions[0].pos)
  const rootFunction = makeFunctionNode(functions[0].name, [theGodArgument], {}, functions[0].pos, true)
  const pos = rootFunction.pos

  const clauses = functions.map(clause => makeClauseNode(makeArrayLitteralNode(clause.args, clause.pos), clause.body, clause.pos))
  clauses.push(
    makeClauseNode(
      makeIdentifierNode('whatever', false, pos),
      makeThrowNode(
        makeConstantNode(h('no_clause_matched'), 'atom', pos),
        makeStringNode(`Not even a single pattern for ${rootFunction.name} matched`, pos), pos)))
  rootFunction.body = makeMatcherNode(clauses, theGodArgument, rootFunction.pos)
  return rootFunction
}

module.exports = {combine}
