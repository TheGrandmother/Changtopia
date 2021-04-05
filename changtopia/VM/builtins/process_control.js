const {h} = require('../../util/hash.js')
const {toJsString} = require('../../util/strings.js')
const Pid = require('../pid.js')

const processControlFunctions = [
  {
    functionId: 'send',
    core: true,
    exec: (process, returnLocation, recipient, ...payload) => {
      recipient = Pid.toPid(recipient)
      if (returnLocation === '__dump__') {
        process.sendMessage({recipient, payload})
      } else {
        process.sendMessage({recipient, payload}, returnLocation)
      }
    }
  },
  {
    functionId: 'death_hook',
    core: true,
    exec: (process, _, recipient, ...payload) => {
      process.stack.frames[0].deathHook = {recipient, payload}
    }
  },
  {
    functionId: 'request',
    core: true,
    exec: (process, returnLocation, recipient, ...payload) => {
      if (returnLocation === '__dump__') {
        process.sendMessage({recipient, payload})
      } else {
        process.sendMessage({recipient, payload}, returnLocation)
      }
    }
  },
  {
    functionId: 'listen',
    core: true,
    exec: (process, returnLocation, funcRef, ...args) => {
      const [module, functionId, ...bindings] = funcRef
      process.listen(toJsString(module), toJsString(functionId), returnLocation, args, bindings)
      return 0
    }
  },
  {
    functionId: 'spawn',
    core: true,
    exec: (process, returnLocation, funcRef, ...args) => {
      const [module, functionId, ...bindings] = funcRef
      if (returnLocation === '__dump__') {
        process.sendMessage({payload: [module, functionId, bindings, ...args], internal: 'spawn'})
      } else {
        process.sendMessage({payload: [module, functionId, bindings, ...args], internal: 'spawn'}, returnLocation)
      }
    }
  },
  {
    functionId: 'link',
    core: true,
    exec: (process, returnLocation, pid) => {
      process.link(pid)
      return 0
    }
  },
  {
    functionId: 'unlink',
    core: true,
    exec: (process, returnLocation, pid) => {
      process.unlink(pid)
      return 0
    }
  },
  {
    functionId: 'zeit_aus',
    core: true,
    exec: (process, returnLocation, duration) => {
      process.setTimeout(duration)
      return 0
    }
  },
  {
    functionId: 'zeit_in',
    core: true,
    exec: (process) => {
      process.unsetTimeout()
      return 0
    }
  },

  {
    functionId: 'load',
    core: true,
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
    core: true,
    exec: (process, returnLocation, funcRef, ...args) => {
      const [_moduleName, _functionName, ...bindings] = funcRef
      const moduleName = String.fromCharCode(..._moduleName)
      const functionName = String.fromCharCode(..._functionName)
      process.bindFunction(moduleName, functionName, returnLocation, args, bindings)
      return h('__ignore_return') //The binding does the returning not this call
    }
  }
]

module.exports = {processControlFunctions}
