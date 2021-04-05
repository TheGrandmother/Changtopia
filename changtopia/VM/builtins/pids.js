const {fromJsString} = require('../../util/strings.js')
const Pid = require('../pid.js')
const pidHelpers = [
  {
    functionId: 'my_pid',
    core: true,
    exec: (process) => {
      return process.pid
    }
  },

  {
    functionId: 'io_pid',
    core: true,
    exec: (process) => {
      return Pid.ioPid(process.vm.host)
    }
  },

  {
    functionId: 'mediator_pid',
    core: true,
    exec: () => {
      return Pid.mediatorPid()
    }
  },

  {
    functionId: 'destruct_pid',
    core: true,
    exec: (process,_ , pid) => {
      return [pid.host, pid.instance, pid.id]
    }
  },

  {
    functionId: 'pid_to_string',
    core: true,
    exec: (process, _, pid) => {
      return fromJsString(Pid.toPid(pid).toString())
    }
  }
]

module.exports = {pidHelpers}
