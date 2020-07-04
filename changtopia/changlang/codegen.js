const {inspect} = require('util')
const {CodegenError} = require('../errors.js')

function resolveArgument(arg, labels) {
  const {array, constant, ref, lineLabel} = arg

  if (constant !== undefined) {
    return constant
  }

  if (array !== undefined) {
    return array
  }

  if (ref !== undefined) {
    return ref
  }

  if (lineLabel) {
    if (labels[lineLabel]) {
      return labels[lineLabel]
    } else {
      return {unresolved: lineLabel}
    }
  }

  throw new CodegenError(`${inspect(arg)} is a wierd fucking argument`)

}

function makeBasicInstruction(instruction, labels) {
  const {id, args} = instruction
  const unresolvedArgs = {}

  const resolvedArgs = args.map( (arg, i) => {
    const resolution = resolveArgument(arg, labels)
    if (typeof resolution === 'object' && resolution.unresolved) {
      unresolvedArgs[resolution.unresolved] = i
      return resolution.unresolved
    } else {
      return resolution
    }
  })

  return {inst: {id, args: resolvedArgs}, unresolvedArgs: unresolvedArgs}
}

function generateCode(indtermediateFunction, moduleName) {
  const {body, name, argLocations, unbound} = indtermediateFunction
  const resolvedLabels = {}
  const annotatedCode = []
  let line = 0

  body.forEach(pseudoInstruction => {
    const {instruction, lineLabel} = pseudoInstruction

    if (instruction) {
      const {inst, unresolvedArgs} = makeBasicInstruction(instruction, resolvedLabels)
      annotatedCode.push({pos: line, inst, unresolvedArgs})
      line += 1
      return
    }

    if (lineLabel) {
      resolvedLabels[lineLabel] = line
      return
    }

    throw new CodegenError(`${inspect(pseudoInstruction)} is a wierd fucking insruction`)

  })

  const code = annotatedCode.map((line) => {
    const {inst, unresolvedArgs} = line
    const {id, args} = inst
    Object.keys(unresolvedArgs).forEach((label) => {
      const val = resolvedLabels[label]
      if(val === undefined) {
        throw new Error(`The label ${label} has litteraly not been resolved`)
      }
      args[unresolvedArgs[label]] = val
    })
    return {id, args}
  })

  return {name, code, argLocations, functionId: name, moduleName, unbound}
}

module.exports = {
  generateCode
}
