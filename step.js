const {ops} = require('./instructions/ops.js')
const {hash} = require('./util/hash')
const {Process} = require('./process.js')
const fs = require('fs')
const process = require('process')

let instructionsEvaluated = 0

function executeInstruction (process) {
  const inst = process.getCurrentInstruction()
  ops[inst.id].evaluate(process, ...inst.args)
  instructionsEvaluated += 1
}


function run (process) {
  while (!process.halted) {
    executeInstruction(process)
  }
  console.log(`Halted with status ${process.status}`)
  console.log(`Function ${process.frame.functionId} last words are: ${process.frame.data['__return__']}`)
}

//run(proc)

function main () {
  const [,, inFile] = process.argv
  const functions = JSON.parse(fs.readFileSync(inFile).toString())
  const proc = new Process()
  functions.forEach((func) => proc.addFunction(func))
  proc.bindFunction('_entry','program_result', [])
  const start = (new Date()).getTime()
  run(proc)
  const duration = (new Date()).getTime() - start
  console.log(`We have evaluated: ${instructionsEvaluated} instructions`)
  console.log(`It took us ${duration/1000} seconds`)
  console.log(`Giving us about ${parseInt(instructionsEvaluated/(duration/1000))} instructions per second`)
}

main()
