const {chainStatements, makeJumpNode} = require('./ast/control')
const {makeBasicAssignmentNode} = require('./ast/assign')
const {makeIdentifierNode} = require('./ast/basics')
const {CompilerError} = require('../errors.js')
const {randomHash} = require('../util/hash.js')
//const {inspect} = require('util')

function tailOptimize (func) {

  if (!(func.type === 'function' || func.type === 'closure')) {
    return
  }

  const name = func.cannonicalName || func.name

  function isCallRecursive(node) {
    if (node.type !== 'call') {
      return false
    }
    if (node.module === 'bif' && node.name === 'run') {
      return node.args[0].name === name
    } else {
      return !node.module && node.name === name
    }
  }

  function isTailRecursive(node) {
    if (!node) {
      return true
    }

    if (node.type === 'closure') {
      tailOptimize(node)
      return true
    }

    if (node.type === 'return' && isCallRecursive(node.rhs)) {
      return true
    }

    if (isCallRecursive(node)) {
      return false
    }

    return isTailRecursive(node.lhs) && isTailRecursive(node.rhs)
  }

  function optimize(node) {
    if (!node) {
      return
    }
    if (node.type === 'return') {
      if (isCallRecursive(node.rhs)) {
        if (node.rhs.module === 'bif') {
          // Here we know that the first argument is the fucntion ref. We can drop it like it was hot
          node.rhs.args = node.rhs.args.slice(1)
        }
        if (node.rhs.args.length !== func.args.length) {
          throw new CompilerError(`${name} takes ${func.args.length} arguments but only ${node.rhs.args.length} where provided at line ${node.pos.line} col ${node.pos.col}`)
        }
        const randomIdent = randomHash()
        const moves = node.rhs.args.map((arg, i) => makeBasicAssignmentNode(`${func.args[i].name}_tco_${randomIdent}`, arg, node.pos))
        if (moves.length !== 0) {
          const thing = chainStatements([...moves, ...func.args.map(({name}) => makeBasicAssignmentNode(name, makeIdentifierNode(`${name}_tco_${randomIdent}`, false, node.pos))), makeJumpNode(func.entryLabel, node.pos)])
          node.type = thing.type
          node.rhs = thing.rhs
          node.lhs = thing.lhs
          delete node.name
          delete node.args
          delete node.module
        } else {
          const jumpNode = makeJumpNode(func.entryLabel, node.pos)
          node.type = jumpNode.type
          node.label = jumpNode.label
          delete node.name
          delete node.args
          delete node.module
        }
      }
    }
    optimize(node.lhs)
    optimize(node.rhs)
  }

  if (isTailRecursive(func.body)) {
    func.entryLabel = `_${name}_entry_label`
    optimize(func.body)
  }

}

module.exports.tailOptimize = tailOptimize
