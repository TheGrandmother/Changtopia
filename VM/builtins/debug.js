const debugFunctions = [
  {
    functionId: '_log',
    bif: true,
    exec: (process, _, ...args) => {
      console.log(`DBG: ${process.pid}/${process.getCurrentFunctionId()}:\t ${args.join(' ')}`)
    }
  }
]

module.exports = {debugFunctions}
