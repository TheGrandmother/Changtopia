const {chainStatements, makeJumpNode} = require('./ast/control')
const {makeBasicAssignmentNode} = require('./ast/assign')
const {inspect} = require('util')

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

module.exports.tailOptimize = function (func) {
  if (func.type !== 'function') {
    return
  }

  const name = func.name

  function isTailRecursive(node) {
    if (!node) {
      return true
    }

    if (node.type === 'return') {
      if (node.rhs.type === 'call' && !node.rhs.module && node.rhs.name === name) {
        return true
      }
    }

    if (node.type === 'call' && node.name === name && !node.module) {
      return false
    }

    return isTailRecursive(node.lhs) && isTailRecursive(node.rhs)
  }

  function optimize(node) {
    if (!node) {
      return
    }
    if (node.type === 'return') {
      if (node.rhs.type === 'call' && !node.rhs.module && node.rhs.name === name) {
        const moves = node.rhs.args.map((arg, i) => makeBasicAssignmentNode(`${func.args[i].name}_tmp`, arg))
        if (moves.length !== 0) {
          const thing = chainStatements([...moves, ...func.args.map(({name}) => makeBasicAssignmentNode(name, {type: 'identifier', name: `${name}_tmp`})), makeJumpNode(func.entryLabel)])
          node.type = thing.type
          node.rhs = thing.rhs
          node.lhs = thing.lhs
          delete node.name
          delete node.args
          delete node.module
        } else {
          const jumpNode = makeJumpNode(func.entryLabel)
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
    func.entryLabel = `_${func.name}_entry_label`
    optimize(func.body, 'something')
  }

}