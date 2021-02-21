const {processControlFunctions} = require('./process_control.js')
const {debugFunctions} = require('./debug.js')
const {arrayFunctions} = require('./array_functions.js')
const {pidHelpers} = require('./pids.js')
const {basics} = require('./basic.js')
const {ansi} = require('./ansi.js')
const {math} = require('./math.js')

const functions = {}
const funcs = [
  ...debugFunctions,
  ...arrayFunctions,
  ...processControlFunctions,
  ...pidHelpers,
  ...basics,
  ...ansi,
  ...math
]

funcs.forEach(func => functions[func.functionId] = func)

module.exports  = {
  moduleName: 'bif',
  functions
}
