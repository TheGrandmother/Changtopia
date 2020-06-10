const {randomHash} = require('../util/hash')
const {MallformedPid, UnknownInstance} = require('../errors.js')
const {inspect} = require('util')

class Pid {
  constructor(instance, id, host) {
    if (instance === undefined) {
      throw new UnknownInstance('Instance cannot be undefined for Pid generation')
    }
    this.instance = instance
    this.id = id === undefined ? randomHash() : id
    this.host = host
  }

  isIo () {
    // return this.instance === 0 && this.host === hostId
    return this.instance === 0// the host is broken
  }

  isMediator () {
    // return this.instance === 0 && this.host === hostId
    return this.host === 0 // the host is broken
  }
}

Pid.prototype.toString = function () { return `<${this.host.toString(16)}:${this.instance.toString(16)}:${this.id.toString(16)}>` }
Pid.ioPid = (host) => new Pid(0, 0, host)
Pid.mediatorPid = () => new Pid(0, 0, 0)

Pid.toPid = (obj) => {
  if (obj instanceof Pid) {
    return obj
  } else {
    if (obj.instance === undefined || obj.id === undefined || obj.host === undefined) {
      throw new MallformedPid(`This pid ${inspect(obj)} is mallformed`)
    }
    return new Pid(obj.instance, obj.id, obj.host)
  }
}

module.exports = Pid
