const {randomHash} = require('../util/hash')
const {MallformedPid, UnknownInstance} = require('../errors.js')
const {inspect} = require('util')

const hostId = randomHash()

class Pid {
  constructor(instance, id, host) {
    if (instance === undefined) {
      throw new UnknownInstance('Instance cannot be undefined for Pid generation')
    }
    this.instance = instance
    this.id = id === undefined ? randomHash() : id
    this.host = host || hostId
  }

  isIo () {
    return this.instance === 0 && this.host === hostId
  }
}

Pid.prototype.toString = function () { return `<${this.host}:${this.instance}:${this.id}>` }
Pid.hostId = hostId
Pid.ioPid = () => new Pid(0, 0)

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
