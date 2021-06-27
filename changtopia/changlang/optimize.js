const {chainStatements, makeJumpNode} = require('./ast/control')
const {makeBasicAssignmentNode} = require('./ast/assign')
const {makeIdentifierNode} = require('./ast/basics')
const {makeArrayLitteralNode} = require('./ast/arrays.js')
const {CompilerError} = require('../errors.js')

function tailOptimize (func) {

  if (!(func.type === 'function' || func.type === 'closure')) {
    return
  }

  const name = func.cannonicalName || func.name

  function isCallRecursive(node) {
    if (node.type !== 'call') {
      return false
    }
    if (node.module === 'core' && node.name === 'run') {
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
        if (node.rhs.module === 'core') {
          // Here we know that the first argument is the fucntion ref. We can drop it like it was hot
          node.rhs.args = node.rhs.args.slice(1)
        }
        if (node.rhs.args.length !== func.args.length && !func.matchyBoi) {
          throw new CompilerError(`${name} takes ${func.args.length} arguments but only ${node.rhs.args.length} where provided at line ${node.pos.line} col ${node.pos.col}`)
        }
        if (!func.matchyBoi) {
          const moves = node.rhs.args.map((arg, i) => makeBasicAssignmentNode(`${func.args[i].name}_tco`, arg, node.pos))
          if (moves.length !== 0) {
            const thing = chainStatements([...moves, ...func.args.map(({name}) => makeBasicAssignmentNode(name, makeIdentifierNode(`${name}_tco`, false, node.pos))), makeJumpNode(func.entryLabel, node.pos)])
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
        } else {
          const moveToGod = makeBasicAssignmentNode(func.args[0].name, makeArrayLitteralNode(node.rhs.args, node.rhs.pos))
          const jumpNode = makeJumpNode(func.entryLabel, node.pos)
          const thing = chainStatements([moveToGod, jumpNode])
          node.type = thing.type
          node.rhs = thing.rhs
          node.lhs = thing.lhs
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

function resolveAliases(func) {
  const {body, refs} = func
  Object.values(refs).forEach((ref) => ref.safe = true)

  //Resolve aliases
  for (let line of body) {
    const {instruction} = line
    if (!instruction) { continue }
    const {id, args} = instruction
    //console.log(instruction)
    if (id === 'move') {
      const [from, to] = args
      to.alias_of = from
    }
    if (id === 'op') {
      const [_, res, ...__] = args
      res.safe = false
    }
  }

  function replaceAliases(args) {
    let changed = false
    const newArgs =  args.map((arg) => {
      if (!arg.ref) {return arg} // Not even a ref
      if (!arg.safe) {return arg}
      if (arg.arg) {return arg} //dont replace arguments
      if (arg.name && refs[arg.name].alias_of) {
        if (arg.name !== refs[arg.name].alias_of.name) {
          changed = true
          return refs[arg.name].alias_of
        } else {
          return arg // In case some wanker wrote x = x
        }
      }
      return arg
    })
    return [changed, newArgs]
  }

  //Replace Aliases
  function replaceReferences(code) {
    let changed = false
    const newCode = code.map(line => {
      const {instruction} = line
      if (!instruction) { return line }
      const {args} = instruction
      const [_changed, newArgs] = replaceAliases(args)
      changed = changed || _changed
      return {...line, instruction: {...instruction, args: newArgs}}
    })
    if (!changed) {
      return newCode
    } else {
      return replaceReferences(newCode)
    }
  }

  const otto = replaceReferences(body.reverse()).reverse()

  //Drop redundant moves
  const reducedBody = otto.filter((line) => {
    const {instruction} = line
    if (!instruction) { return true }
    const {id, args} = instruction
    if (id === 'move') {
      return args[0] !== args[1]
    }
    return true
  })

  func.body = reducedBody
}

module.exports.tailOptimize = tailOptimize
module.exports.resolveAliases = resolveAliases
