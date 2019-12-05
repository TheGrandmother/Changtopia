const {ops} = require('./instructions/ops.js')
const {hash} = require('./util/hash')
const {Process} = require('./vm.js')
const fs = require('fs')
const process = require('process')

const h = hash

function executeInstruction (process) {
  const inst = process.getCurrentInstruction()
  ops[inst.id].evaluate(process, ...inst.args)
}

function run (process) {
  if (!process.halted) {
    executeInstruction(process)
    // console.log(process.frame)
    // console.log(process)
    run(process)
  } else {
    //console.log('HALTED')
    //console.log('status')
    console.log(process.frame.data)
  }
}

const code1 = [
  {id: h('imove'), args: [5, 1]},
  {id: h('imove'), args: [5, 2]},
  {id: h('add'), args: [1, 2, 'arg']}, // 10 at arg
  {id: h('call'), args: [2, 'ret', 'arg']},
  {id: h('add'), args: [1, 'ret', 420]} // 20 at 420
]

const code2 = [
  {id: h('imove'), args: [5, 1]},
  {id: h('add'), args: [1, 'arg', 'ret']}, // 15 at ret
  {id: h('return'), args: []}
]

const proc = new Process()
proc.addFunction(1, code1)
proc.addFunction(2, code2)
proc.bindFunction(1, 1, {})

//run(proc)

function main () {
  const [,, inFile] = process.argv
  const functions = JSON.parse(fs.readFileSync(inFile).toString())
  const proc = new Process()
  proc.addFunction(1, functions[0])
  proc.bindFunction(1,1,{})
  run(proc)
}

main()
