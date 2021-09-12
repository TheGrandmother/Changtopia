// const {h} = require('../util/hash.js')
const {inspect} = require('util')
const Errors = require('../../errors.js')

const ops = {
  ...require('./arrayInstructions.js'),
  ...require('./basicInstructions.js'),
  ...require('./controlInstructions.js')
}

let times = {}
let instructionsSinceLastReport = 0


function evaluateInstruction(process, instruction) {
  const {enableMetrics, metricsSampleRate} = process.vm
  let start

  if (!ops[instruction.id]) {
    throw new Errors.StrangeInstructionError(`I honestly dont know how to evaluate ${inspect(instruction)}`)
  }

  if (enableMetrics) {
    times[instruction.id] = {
      calls: 0,
      time: 0,
      ...times[instruction.id]
    }
    start = performance.now()
  }

  const ret = ops[instruction.id].evaluate(process, ...instruction.args)

  if (enableMetrics) {
    const {calls, time} = times[instruction.id]
    times[instruction.id] = {
      calls: calls + 1,
      time: time + (performance.now() - start),
    }
    instructionsSinceLastReport += 1

    if (instructionsSinceLastReport >= 10000 / metricsSampleRate) {
      process.vm.postMetrics('instructions', times)
      instructionsSinceLastReport = 0
      times = {}
    }
  }
  return ret
}

module.exports = {
  evaluateInstruction
}
