const {chainStatements, makeJumpNode} = require('./ast/control')
const {makeBasicAssignmentNode} = require('./ast/assign')
const {makeIdentifierNode} = require('./ast/basics')
const {CompilerError} = require('../errors.js')
const {randomHash} = require('../util/hash.js')
//const {inspect} = require('util')

const NOT_KNOWN = '___NOT_KNOWN'

module.exports.dropRedundantMoves  = function(code) {
  const boundMap = {}
  const newCode = []

  function resolveRootRef(arg) {
    function _resolveRootRef(ref) {
      if (!boundMap[ref.ref]) {
        return ref
      } else if (boundMap[ref.ref] === NOT_KNOWN) {
        return ref
      } else {
        return _resolveRootRef(boundMap[ref.ref])
      }
    }
    if (arg.ref) {
      return _resolveRootRef(arg)
    } else {
      return arg
    }
  }

  code.forEach((line) => {
    if (!line.instruction) {
      newCode.push(line)
      return
    }
    const {instruction} = line
    const {id, args} = instruction

    if (id === 'move') {
      let [src, dest] = args
      if (dest.ref === '__return__') {
        // We cannot change the return refference
        newCode.push(line)
        return
      }
      boundMap[dest.ref] = src
      if (!boundMap[src.ref]) {
        // the sorce location has not been found
        // keep the instruction
        newCode.push(line)
        return
      } else if (boundMap[src.ref] === NOT_KNOWN) {
        // The source has been found but its value cant be determined
        newCode.push(line)
        return
      } else {
        // The source location is known
        // drop the move
        return
      }
    }

    if (id === 'imove') {
      let [_, dest] = args
      boundMap[dest.ref] = NOT_KNOWN
      newCode.push(line)
      return
    }

    if (id === 'call') {
      let [_module, _name, return_location, ..._args] = args
      boundMap[return_location.ref] = NOT_KNOWN
      const substituted = _args.map(arg => resolveRootRef(arg))
      newCode.push({instruction: {...instruction, args: [_module, _name, return_location, ...substituted]}})
      return
    }

    if (id === 'op') {
      let [_op, return_location, ..._args] = args
      boundMap[return_location.ref] = NOT_KNOWN
      const substituted = _args.map(arg => resolveRootRef(arg))
      newCode.push({instruction: {...instruction, args: [_op, return_location, ...substituted]}})
      return
    }

    if (id === 'arrayCreate') {
      let [returnLocation, blobPos, ..._args] = args
      boundMap[returnLocation.ref] = NOT_KNOWN
      const substituted = _args.map(arg => resolveRootRef(arg))
      newCode.push({instruction: {...instruction, args: [returnLocation, blobPos, ...substituted]}})
      return
    }

    if (id === 'arrayUnpack') {
      // 19: arrayUnpack 609_i, true, 1, 0, command_a610, rest_a611
      let [arrayLoc, hasBlob, leading, trailing, ..._args] = args
      _args.map(({ref}) => boundMap[ref] = NOT_KNOWN)
      newCode.push({instruction: {...instruction, args: [resolveRootRef(arrayLoc), hasBlob, leading, trailing,..._args]}})
      return
    }

    if (id === 'jump_if_false') {
      let [cond, location] = args
      newCode.push({instruction: {...instruction, args: [resolveRootRef(cond), location]}})
      return
    }

    if (id === 'jump_if_true') {
      let [cond, location] = args
      newCode.push({instruction: {...instruction, args: [resolveRootRef(cond), location]}})
      return
    }

    if (id === 'return') {
      let [location] = args
      newCode.push({instruction: {...instruction, args: [resolveRootRef(location)]}})
      return
    }

    newCode.push({instruction})
  })

  return newCode
}

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
