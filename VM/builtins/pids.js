const {fromJsString} = require('../../util/strings.js')
const Pid = require('../pid.js')
const pidHelpers = [
  {
    functionId: 'my_pid',
    bif: true,
    exec: (process) => {
      return process.pid
    }
  },

  {
    functionId: 'io_pid',
    bif: true,
    exec: () => {
      return Pid.ioPid()
    }
  },

  {
    functionId: 'destruct_pid',
    bif: true,
    exec: (process,_ , pid) => {
      return [pid.host, pid.instance, pid.id]
    }
  },

  {
    functionId: 'pid_to_string',
    bif: true,
    exec: (process, _, pid) => {
      return fromJsString(Pid.toPid(pid).toString())
    }
  }
]

module.exports = {pidHelpers}
