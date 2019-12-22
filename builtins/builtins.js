const {processControlFunctions} = require('./process_control.js')
const {debugFunctions} = require('./debug.js')

const builtins = processControlFunctions.concat(debugFunctions)

module.exports  = {builtins}
