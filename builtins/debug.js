const debugFunctions = [
  {
    functionId: '_log',
    hwFunction: true,
    exec: (process, _, ...args) => {
      console.log(`DBG: ${process.pid}/${process.getCurrentFunctionId()}:\t ${args.join(' ')}`)
    }
  }
]

module.exports = {debugFunctions}
