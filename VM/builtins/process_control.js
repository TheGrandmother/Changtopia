const {h, resolveHash} = require('../../util/hash.js')
const {toJsString} = require('../../util/strings.js')
const Pid = require('../pid.js')

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
    functionId: 'listen',
    bif: true,
    exec: (process, returnLocation, module, functionId, ...args) => {
      process.listen(toJsString(module), toJsString(functionId), returnLocation, args)
      return 0
    }
  },
  {
    functionId: 'spawn',
    bif: true,
    exec: (process, returnLocation, module, functionId, ...args) => {
      if (returnLocation === '__dump__') {
        process.sendMessage({payload: [module, functionId, ...args], internal: 'spawn'})
      } else {
        process.sendMessage({payload: [module, functionId, ...args], internal: 'spawn'}, returnLocation)
      }
      //return process.vm.spawnProcess(toJsString(module), toJsString(functionId), args)
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
  },

  {
    functionId: 'atomToString',
    bif: true,
    exec: (process, returnLocation, atom) => {
      return resolveHash(atom).split('').map(c => c.charCodeAt(0))
    }
  },

  {
    functionId: 'load',
    bif: true,
    exec: (process, returnLocation, _moduleName) => {
      const moduleName = String.fromCharCode(..._moduleName)
      if (process.vm.modules[moduleName]) {
        return h('already_loaded')
      } else {
        process.sendMessage({recipient: 0, payload: [h('load_module'), moduleName]}, returnLocation)
      }
    }
  },

  {
    functionId: 'run',
    bif: true,
    exec: (process, returnLocation, _moduleName, _functionName, ...args) => {
      const moduleName = String.fromCharCode(..._moduleName)
      const functionName = String.fromCharCode(..._functionName)
      process.bindFunction(moduleName, functionName, returnLocation, args)
      return h('__ignore_return')
    }
  }
]

module.exports = {processControlFunctions}
