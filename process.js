const {randomHash} = require('./util/hash')
const {LocationInvalidError} = require('./errors.js')
const {evaluateInstruction} = require('./instructions/ops.js')

class Process {
  constructor (vm, pid) {
    this.vm = vm
    this.stack = new Stack()
    this.inbox = []
    this.pid = pid
    this.dict = {}
    this.frame = {}
    this.functions = {}
    this.finished = false
    this.waiting = false
    this.status = 'cold'
    this.awaitingResponse = null
    this.accepting = false
    this.handler = null
  }

  getCurrentFunctionId() {
    return this.frame.functionId
  }

  bindFunction (functionId, returnLocation, args) {
    const func = this.functions[functionId]
    if (!func) {
      throw new Error(`Bro we have litterally no function called ${functionId}`)
    }

    if (func.hwFunction) {
      const retval = this.functions[functionId].exec(this, returnLocation, ...args)
      this.frame.data[returnLocation] = retval
    } else {
      this.bindNormalFunction(...arguments)
    }

  }

  await(handlerId, returnLocation, additionalArgs) {
    this.handler = {handlerId, returnLocation, additionalArgs}
    this.waiting = true
    this.awaitingResponse = null
  }

  checkInbox() {
    if (this.awaitingResponse) {
      for (let i = 0; i < this.inbox.length; i++) {
        const message = this.inbox[i]
        if (message.requestId === this.awaitingResponse.id) {
          this.frame.data[this.awaitingResponse.responseLocation] = message.payload
          this.awaitingResponse = null
          this.waiting = false
          this.inbox.splice(i, i+1)
          return true
        }
      }
      return false
    } else {
      const message = this.inbox.splice(0, 1)[0]
      if (message) {
        this.bindHandlerFunction(message)
        this.handler = null
        this.waiting = false
        return true
      } else {
        return false
      }
    }
  }


  sendMessage(message, responseLocation) {
    message.sender = this.pid
    message.id = randomHash()
    if (responseLocation) {
      this.awaitingResponse = {id: message.id, responseLocation}
      message.requiresResponse = true
      this.waiting = true
    }

    this.vm.dispatchMessage(message)
  }

  bindHandlerFunction(message) {
    const {id, sender, payload, requiresResponse} = message

    const {handlerId, returnLocation, additionalArgs} = this.handler
    const {argLocations} = this.functions[handlerId]
    const args = [...additionalArgs, sender, ...payload]
    if (argLocations.length !== args.length) {
      throw new Error(`Argument length mismatch calling ${handlerId}. You gave me ${args} but I need stuff to fill ${argLocations}`)
    }
    const argData = {}
    argLocations.forEach((loc, i) => argData[loc] = args[i])

    let frame = null
    if (requiresResponse) {
      frame = new Frame(handlerId, returnLocation, argData, (res) => this.sendMessage({recipient: sender, payload: res, requestId: id}))
    } else {
      frame = new Frame(handlerId, returnLocation, argData)
    }
    this.stack.addFrame(frame)
    this.frame = frame
  }

  bindNormalFunction(functionId, returnLocation, args) {
    const func = this.functions[functionId]
    if (!func) {
      throw new Error(`Sorry dude, but there just ain't know ${functionId} function`)
    }

    if (func.argLocations.length !== args.length) {
      throw new Error(`Argument length mismatch calling ${functionId}. You gave me [${args}] but i need stuff to fill [${func.argLocations}]`)
    }
    const argData = {}
    func.argLocations.forEach((loc, i) => argData[loc] = args[i])
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
      this.finished = true
    }
  }

  setLine(line) {
    if (typeof line !== 'number' && line >= this.functions[this.frame.functionId].code.length) {
      throw new Error(`Process ${this.pid} tried to jump to line ${line} which isnt even real`)
    }
    this.frame.line = line
  }

  returnFromFunction() {
    const currentFrame = this.stack.frames.pop()
    const oldFrame = this.stack.frames.pop()

    if (!oldFrame) {
      this.finished = true
      this.status = 'Out of stack frames :/'
      return
    }

    const returnValue = currentFrame.data['__return__']
    currentFrame.returnCallback(returnValue)
    oldFrame.data[currentFrame.resLocation] = returnValue

    this.stack.frames.push(oldFrame)
    this.frame = oldFrame
  }

  executeInstruction() {
    // pretty(this.pid, this.frame.functionId, this.frame.line, this.getCurrentInstruction())
    evaluateInstruction(this, this.getCurrentInstruction())
  }

  cleanup() {
    //TBI
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
  constructor (functionId, resLocation, data, returnCallback = () => {}) {
    this.data = data
    this.resLocation = resLocation
    this.functionId = functionId
    this.line = 0
    this.returnCallback = returnCallback
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
