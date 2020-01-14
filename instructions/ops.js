// const {h} = require('../util/hash.js')
const {inspect} = require('util')
const Errors = require('../errors.js')

const ops = {
  ...require('./arrayInstructions.js'),
  ...require('./basicInstructions.js'),
  ...require('./controlInstructions.js')
}

function evaluateInstruction(process, instruction) {
  if (!ops[instruction.id]) {
    throw new Errors.StrangeInstructionError(`I honestly dont know how to evaluate ${inspect(instruction)}`)
  }
  return ops[instruction.id].evaluate(process, ...instruction.args)
}

module.exports = {
  evaluateInstruction
}
