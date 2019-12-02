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
    const frame = new Frame(functionId, returnLocation, args)
    this.stack.addFrame(frame)
    this.frame = frame
  }

  addFunction (functionId, code) {
    this.functions[functionId] = code
  }

  getCurrentInstruction () {
    return this.functions[this.frame.functionId][this.frame.line]
  }

  incrementLine() {
    this.frame.line += 1
    if (this.frame.line >= this.functions[this.frame.functionId].length) {
      console.log('End of the code bruh')
      this.status = 'End of code'
      this.halted = true
    }
  }

  returnFromFunction() {
    console.log('returning')
    console.log(this.stack)
    const currentFrame = this.stack.frames.pop()
    const oldFrame = this.stack.frames.pop()
    if (!oldFrame) {
      this.halted = true
      this.status = 'Out of stack frames :/'
      return
    }
    oldFrame.data[currentFrame.resLocation] = currentFrame.data[currentFrame.resLocation]
    console.log('Going from frame:', currentFrame)
    console.log('To frame:', oldFrame)
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
