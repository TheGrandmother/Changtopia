const {inspect} = require('util')

function resolveArgument(arg, labels) {
  const {constant, intermediateRef, assignmentRef, lineLabel} = arg

  if (constant !== undefined) {
    return constant
  }

  if (intermediateRef !== undefined) {
    return intermediateRef
  }

  if (assignmentRef !== undefined) {
    return assignmentRef
  }

  if (lineLabel) {
    if (labels[lineLabel]) {
      return labels[lineLabel]
    } else {
      return {unresolved: lineLabel}
    }
  }

  throw new Error(`${inspect(arg)} is a wierd fucking argument`)

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

function generateCode(indtermediateFunction) {
  const {body, name, refs} = indtermediateFunction
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

    throw new Error(`${inspect(pseudoInstruction)} is a wierd fucking insruction`)

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

  return code
}

module.exports = {
  generateCode
}
