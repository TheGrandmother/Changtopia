const processControlFunctions = [
  {
    functionId: 'send',
    bif: true,
    exec: (process, _, recipient, ...payload) => {
      process.sendMessage({recipient, payload})
    }
  },
  {
    functionId: 'request',
    bif: true,
    exec: (process, responseLocation, recipient, ...payload) => {
      process.sendMessage({recipient, payload}, responseLocation)
    }
  },
  {
    functionId: 'pid',
    bif: true,
    exec: (process) => {
      return process.pid
    }
  },
  {
    functionId: 'listen',
    bif: true,
    exec: (process, returnLocation, functionId, ...args) => {
      process.listen(functionId, returnLocation, args)
      return 0
    }
  },
  {
    functionId: 'spawn',
    bif: true,
    exec: (process, returnLocation, functionId, ...args) => {
      const _args = []
      args.forEach(a => _args.push(process.frame.data[a]))
      return process.vm.spawnProcess(functionId, _args)
    }
  },
  {
    functionId: 'link',
    bif: true,
    exec: (process, returnLocation, pid) => {
      process.link(pid)
      return 0
    }
  },
  {
    functionId: 'unlink',
    bif: true,
    exec: (process, returnLocation, pid) => {
      process.unlink(pid)
      return 0
    }
  },
  {
    functionId: 'zeit_aus',
    bif: true,
    exec: (process, returnLocation, duration) => {
      process.setTimeout(duration)
      return 0
    }
  },
  {
    functionId: 'zeit_in',
    bif: true,
    exec: (process) => {
      process.unsetTimeout()
      return 0
    }
  }

]

module.exports = {processControlFunctions}
