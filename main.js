const {Vm} = require('./vm.js')
const fs = require('fs')
const process = require('process')

function main () {
  const [,, inFile] = process.argv
  const functions = JSON.parse(fs.readFileSync(inFile).toString())
  const vm = new Vm()
  vm.loadFunctions(functions)

  vm.start('_entry', [])
}

main()
