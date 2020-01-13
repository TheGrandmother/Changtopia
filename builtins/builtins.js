const {processControlFunctions} = require('./process_control.js')
const {debugFunctions} = require('./debug.js')
const {arrayFunctions} = require('./array_functions.js')

const builtins = {}

processControlFunctions.concat(debugFunctions, arrayFunctions).forEach(func => builtins[func.functionId] = func)

module.exports  = {
  moduleName: 'bif',
  functions: builtins
}
