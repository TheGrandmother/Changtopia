const {randomHash, h} = require('./util/hash')
const {evaluateInstruction} = require('./instructions/ops.js')
const {pretty} = require('./instructions/pretty.js')
const {
  LocationEmptyError,
  UnknownFunctionError,
  UnknownModuleError,
  ArgumentCountError,
  OddLineError,
  RuntimeError
} = require('./errors.js')

class Process {
  constructor (vm, pid) {
    this.vm = vm
    this.stack = new Stack()
    this.inbox = []
    this.pid = pid
    this.dict = {}
    this.frame = {}
    this.finished = false
    this.waiting = false
    this.status = 'cold'
    this.awaitingResponse = null
    this.accepting = false
    this.handler = null
    this.linkedProcesses = []
    this.handlingRequest = null
    this.timeout = null
    this.abandonedRequests = []
  }

  link(pid) {
    this.linkedProcesses.push(pid)
  }

  unlink(pid) {
    this.linkedProcesses = this.linkedProcesses.filter(linkedPid => linkedPid !== pid)
  }

  getCurrentFunctionId() {
    return this.frame.func.functionId
  }

  getFunction(module, functionId) {
    if (!this.vm.modules[module]) {
      throw new UnknownModuleError(`Sorry bro, nobody has loaded any ${module} module`)
    }
    const func = this.vm.modules[module].functions[functionId]
    if (!func) {
      throw new UnknownFunctionError(`Bro we the module ${module} has litterally no function called ${functionId}`)
    }
    return func
  }

  bindFunction (module, functionId, returnLocation, args) {
    const func = this.getFunction(module, functionId)
    if (module === 'bif') {
      const retval = func.exec(this, returnLocation, ...args)
      this.frame.write(returnLocation, retval)
    } else {
      this.bindNormalFunction(func, returnLocation, args)
    }

  }

  listen(module, functionId, returnLocation, additionalArgs) {
    const func = this.getFunction(module, functionId)
    this.handler = {func, returnLocation, additionalArgs}
    this.waiting = true
    this.awaitingResponse = null
  }

  addMessage(message) {
    if (message.requestId) {
      const abandonMessage = !!this.abandonedRequests.find(id => id === message.requestId)
      if (abandonMessage) {
        this.abandonedRequests = this.abandonedRequests.filter(id => id !== message.requestId)
        return
      }
    }
    this.inbox.push(message)
  }

  unsetTimeout() {
    this.timeout = null
  }

  setTimeout(duration) {
    this.timeout =  {start: (new Date()).getTime(), duration}
  }

  checkInbox() {
    if (this.timeout) {
      const diff = (new Date()).getTime() - this.timeout.start
      if (diff > this.timeout.duration) {
        // Timeout Occured
        if (this.awaitingResponse) {
          this.frame.write(this.awaitingResponse.responseLocation, h('timeout'))
          this.abandonedRequests.push(this.awaitingResponse.id)
          this.awaitingResponse = null
        } else {
          this.frame.write(this.handler.responseLocation, h('timeout'))
          this.handler = null
        }
        this.unsetTimeout()
        this.waiting = false
        return
      }
    }

    if (this.awaitingResponse) {
      for (let i = 0; i < this.inbox.length; i++) {
        const message = this.inbox[i]
        if (message.requestId === this.awaitingResponse.id) {
          this.frame.data[this.awaitingResponse.responseLocation] = message.payload
          this.awaitingResponse = null
          this.waiting = false
          this.inbox.splice(i, i+1)
        }
      }
    } else {
      const message = this.inbox.splice(0, 1)[0]
      if (message) {
        this.bindHandlerFunction(message)
        this.handler = null
        this.waiting = false
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

    // TODO: Speeed this up
    if (typeof message.payload === 'object') {
      message.payload = JSON.parse(JSON.stringify(message.payload))
    }
    this.vm.dispatchMessage(message)
  }

  bindHandlerFunction(message) {
    const {id, sender, payload, requiresResponse} = message
    if(requiresResponse) {
      this.handlingRequest = {sender, id}
    }

    const {func, returnLocation, additionalArgs} = this.handler
    const {argLocations} = func
    const args = [...additionalArgs, sender, ...payload]
    if (argLocations.length !== args.length) {
      throw new ArgumentCountError(`Argument length mismatch calling ${func.functionId}. You gave me ${args} but I need stuff to fill ${argLocations}`)
    }
    const argData = {}
    argLocations.forEach((loc, i) => argData[loc] = args[i])

    let frame = null
    if (requiresResponse) {
      frame = new Frame(func, returnLocation, argData,
        (res, callingFrame) => {
          this.handlingRequest = null
          if (this.vm.pidExists(sender)) {
            this.sendMessage({recipient: sender, payload: res, requestId: id})
          } else {
            callingFrame.write(returnLocation, h('no_such_pid'))
          }
        })
    } else {
      frame = new Frame(func, returnLocation, argData)
    }
    this.stack.addFrame(frame)
    this.frame = frame
  }

  bindNormalFunction(func, returnLocation, args) {

    if (func.argLocations.length !== args.length) {
      throw new ArgumentCountError(`Argument length mismatch calling ${func.functionId}. You gave me [${args}] but i need stuff to fill [${func.argLocations}]`)

    }
    const argData = {}
    func.argLocations.forEach((loc, i) => argData[loc] = args[i])
    const frame = new Frame(func, returnLocation, argData)
    this.stack.addFrame(frame)
    this.frame = frame
  }

  getCurrentInstruction () {
    return this.frame.func.code[this.frame.line]
  }

  incrementLine() {
    this.frame.line += 1
    if (this.frame.line >= this.frame.func.code.length) {
      this.frame.write('__return__', h('no_return'))
      this.returnFromFunction()
      this.status = 'End of code'
      this.finished = true
    }
  }

  setLine(line) {
    if (typeof line !== 'number' && line >= this.frame.func.code.length) {
      throw new OddLineError(`Process ${this.pid} tried to jump to line ${line} which isnt even real`)
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

    const returnValue = currentFrame.read('__return__')
    oldFrame.write(currentFrame.resLocation, returnValue)
    currentFrame.returnCallback(returnValue, oldFrame)

    this.stack.frames.push(oldFrame)
    this.frame = oldFrame
  }

  executeInstruction() {
    let instruction
    try {
      instruction = this.getCurrentInstruction(this.getCurrentInstruction())
      evaluateInstruction(this, instruction)
    } catch (err) {
      if (err instanceof RuntimeError) {
        if (this.linkedProcesses.length > 0 || this.inbox.length > 0 || this.handlingRequest) {
          const msg = err.message.split('').map(c => c.charCodeAt(0))
          this.linkedProcesses.forEach(linkedPid => {
            this.sendMessage({
              recipient: linkedPid,
              payload: [h('error'), err.errorAtom, msg]})
          })
          this.inbox.forEach(message => {
            if (message.requiresResponse) {
              this.sendMessage({
                recipient: message.sender,
                requestId: message.id,
                payload: [h('error'), err.errorAtom, msg]})
            }
          })
          if (this.handlingRequest) {
            this.sendMessage({
              recipient: this.handlingRequest.sender,
              requestId: this.handlingRequest.id,
              payload: [h('error'), err.errorAtom, this.pid, msg]})
          }
          this.waiting = false
          this.finished = true
        } else {
          console.log('Encountered runtime error but there was no dude there to do stuff said jiggly puff')
          console.log('This went down when trying to evaluate:')
          console.log(this.frame.data)
          console.error(this.frame.data, instruction)
          //pretty(this.pid, this.frame.functionId, this.frame.line, this.getCurrentInstruction())
          throw err
        }
      } else {
        pretty(this.pid, this.frame.functionId, this.frame.line, instruction)
        console.log('Pesant error')
        console.log('This be our data:', this.frame.data)
        throw err
      }
    }
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
  constructor (func, resLocation, data, returnCallback = () => {}) {
    this.data = data
    this.resLocation = resLocation
    this.func = func
    this.functionId = func.functionId
    this.line = 0
    this.returnCallback = returnCallback
  }

  write (location, value) {
    this.data[location] = value
    return location
  }

  read (location) {
    if (this.data[location] === undefined) {
      throw new LocationEmptyError(location)
    }
    return this.data[location]
  }
}

module.exports = {
  Process
}
