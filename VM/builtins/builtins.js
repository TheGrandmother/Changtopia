const {processControlFunctions} = require('./process_control.js')
const {debugFunctions} = require('./debug.js')
const {arrayFunctions} = require('./array_functions.js')
const {pidHelpers} = require('./pids.js')

const functions = {}
const funcs = [
  ...debugFunctions,
  ...arrayFunctions,
  ...processControlFunctions,
  ...pidHelpers
]

funcs.forEach(func => functions[func.functionId] = func)

module.exports  = {
  moduleName: 'bif',
  functions
}
