const {randomHash} = require('./util/hash')
const {LocationInvalidError} = require('./errors.js')

class Process {
  constructor () {
    this.stack = new Stack()
    this.channels = null
    this.pid = randomHash()
    this.dict = {}
    this.frame = {}
    this.functions = {}
    this.halted = false
    this.status = 'cold'
  }

  bindFunction (functionId, returnLocation, args) {
    const {argLocations} = this.functions[functionId]
    if (argLocations.length !== args.length) {
      throw new Error(`Argument length mismatch. You gave me ${args} but i need stuff to fill ${argLocations}`)
    }
    const argData = {}
    argLocations.forEach((loc, i) => argData[loc] = args[i])
    const frame = new Frame(functionId, returnLocation, argData)
    this.stack.addFrame(frame)
    this.frame = frame
  }

  addFunction (func) {
    this.functions[func.functionId] = func
  }

  getCurrentInstruction () {
    return this.functions[this.frame.functionId].code[this.frame.line]
  }

  incrementLine() {
    this.frame.line += 1
    if (this.frame.line >= this.functions[this.frame.functionId].code.length) {
      console.log('End of the code bruh')
      this.status = 'End of code'
      this.halted = true
    }
  }

  setLine(line) {
    if (typeof line !== 'number' && line >= this.functions[this.frame.functionId].code.length) {
      console.log('Tried to jump to silly line')
      this.status = 'Invalid line'
      this.halted = true
    }
    this.frame.line = line
  }

  returnFromFunction() {
    const currentFrame = this.stack.frames.pop()
    const oldFrame = this.stack.frames.pop()
    if (!oldFrame) {
      this.halted = true
      this.status = 'Out of stack frames :/'
      return
    }
    oldFrame.data[currentFrame.resLocation] = currentFrame.data['__return__']
    this.stack.frames.push(oldFrame)
    this.frame = oldFrame
  }

}

class Stack {
  constructor () {
    this.frames = []
  }

  addFrame (frame) {
    this.frames.push(frame)
  }
}

class Frame {
  constructor (functionId, resLocation, data) {
    this.data = data
    this.resLocation = resLocation
    this.functionId = functionId
    this.line = 0
  }

  write (value, location) {
    this.data[location] = value
    return location
  }

  read (location) {
    if (!this.data[location]) {
      throw LocationInvalidError(location)
    }
    return this.data[location]
  }
}

module.exports = {
  Process
}
