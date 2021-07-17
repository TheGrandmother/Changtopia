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
          const moves = node.rhs.args.map((arg, i) => makeBasicAssignmentNode(`${func.args[i].name}_tco`, arg, node.pos, true))
          if (moves.length !== 0) {
            const thing = chainStatements([...moves, ...func.args.map(({name}) => makeBasicAssignmentNode(name, makeIdentifierNode(`${name}_tco`, false, node.pos), node.pos, true)), makeJumpNode(func.entryLabel, node.pos)])
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
          const moveToGod = makeBasicAssignmentNode(func.args[0].name, makeArrayLitteralNode(node.rhs.args, node.rhs.pos, true))
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
  const aliases = {}

  //Resolve aliases
  body.forEach((line, i) => {
    const {instruction} = line
    if (!instruction) { return }
    const {id, args} = instruction
    if (id === 'arrayCreate') {
      const [location, blobCount, blobIndex, ...entries] = args
      if (blobCount?.constant === 1 && blobIndex?.constant === 0) {
        //This could be a quickpush
        aliases[location.ref] = {ref: entries[0], lineNo: i, name: location.ref}
      }
    }
  })

  function checkUnsafeAlias(alias) {
    function trace(lineNo) {
      if (lineNo >= func.body.length) {
        return true
      }
      const line = func.body[lineNo]
      const {instruction} = line
      if (!instruction) {
        return trace(lineNo + 1)
      }
      const {id, args} = instruction
      const aliasInArgs = args.some((arg) => arg.ref === alias.ref.ref)
      if (aliasInArgs) {
        if (id === 'op') { return false }
        if (id === 'arrayCreate') { return false }
        if (id === 'call') { return false }
        if (id === 'move') {
          // It is fine if we are moving aourselves into the alias
          return args[0].ref === alias.name && args[1].ref === alias.ref.ref
        }
      }
      return trace(lineNo + 1)
    }
    return trace(alias.lineNo + 1)

  }

  const coolAliases = Object.values(aliases).filter(checkUnsafeAlias).reduce((acc, alias) => ({...acc, [alias.name]: alias}), {})

  if (Object.keys(coolAliases).length === 0) {return}
  console.log(`We could find ${Object.keys(coolAliases).length} quickpushes in ${func.name}`)

  function replaceAliases(aliases) {
    Object.values(aliases).forEach((alias) => {
      func.body.slice(alias.lineNo).forEach((line) => {
        const { instruction } = line
        if (!instruction) { return }
        const {args} = instruction
        instruction.args = args.map((arg) => {
          if (arg.ref === alias.name) {
            return alias.ref
          }
          return arg
        })
      })
    })
  }

  replaceAliases(coolAliases)

  return

  // const findMyAlias = (me) => Object.values(refs).find(ref => ref.aliasOf && ref.aliasOf.name == me.name)

  // function replaceAliases(args) {
  //   let changed = false
  //   const newArgs =  args.map((arg) => {
  //     if (!arg.ref) {return arg} // Not even a ref
  //     if (!arg.safe) {return arg}
  //     if (arg.arg) {return arg} //dont replace arguments
  //     //findMyAlias(arg) && console.log(`I am ${arg.name} and my alias is ${findMyAlias(arg).name}`)
  //     const myAlias = findMyAlias(arg)
  //     if (myAlias && myAlias.safe) {
  //       if (arg.name !== myAlias.name) {
  //         console.log(`changing ${arg.name} to ${myAlias.name}`)
  //         changed = true
  //         return myAlias
  //       } else {
  //         return arg // Some vapid cunt wrote x = x
  //       }
  //     }
  //     return arg
  //   })
  //   return [changed, newArgs]
  // }

  // //Replace Aliases
  // function replaceReferences(code) {
  //   let changed = false
  //   const newCode = code.map(line => {
  //     const {instruction} = line
  //     if (!instruction) { return line }
  //     const {args} = instruction
  //     const [_changed, newArgs] = replaceAliases(args)
  //     changed = changed || _changed
  //     // _changed && console.log(`new args for ${instruction.id}, ${newArgs.map(arg => arg.name || arg.ref)}`)
  //     return {...line, instruction: {...instruction, args: newArgs}}
  //   })
  //   if (!changed) {
  //     return newCode
  //   } else {
  //     return replaceReferences(newCode)
  //   }
  // }

  // const otto = replaceReferences(body.reverse()).reverse()

  // // console.log(refs)

  // // console.log('=============')
  // // console.log('=============')
  // // console.log('=============')
  // // console.log('=============')

  // // console.log(otto)

  // //Drop redundant moves
  // const reducedBody = otto.filter((line) => {
  //   const {instruction} = line
  //   if (!instruction) { return true }
  //   const {id, args} = instruction
  //   if (id === 'move') {
  //     return args[0] !== args[1]
  //   }
  //   return true
  // })


  // //console.log('Bitch what.....', reducedBody)
  // func.body = reducedBody
}

module.exports.tailOptimize = tailOptimize
module.exports.resolveAliases = resolveAliases
