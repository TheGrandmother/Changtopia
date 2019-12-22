const processControlFunctions = [
  {
    functionId: 'send',
    hwFunction: true,
    exec: (process, _, recipient, ...payload) => {
      process.sendMessage({recipient, payload})
    }
  },
  {
    functionId: 'request',
    hwFunction: true,
    exec: (process, responseLocation, recipient, ...payload) => {
      process.sendMessage({recipient, payload}, responseLocation)
    }
  },
  {
    functionId: 'pid',
    hwFunction: true,
    exec: (process) => {
      return process.pid
    }
  },
  {
    functionId: 'listen',
    hwFunction: true,
    exec: (process, returnLocation, functionId, ...args) => {
      process.await(functionId, returnLocation, args)
      return 0
    }
  },
  {
    functionId: 'spawn',
    hwFunction: true,
    exec: (process, returnLocation, functionId, ...args) => {
      const _args = []
      args.forEach(a => _args.push(process.frame.data[a]))
      return process.vm.spawnProcess(functionId, _args)
    }
  }
]

module.exports = {processControlFunctions}
