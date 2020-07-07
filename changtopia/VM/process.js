const {randomHash, h} = require('../util/hash')
const {fromJsString} = require('../util/strings.js')
const {evaluateInstruction} = require('./instructions/ops.js')
const {pretty, prettyInst} = require('./instructions/pretty.js')
const {inspect} = require('util')
const {
  LocationEmptyError,
  UnknownFunctionError,
  UnknownModuleError,
  ArgumentCountError,
  OddLineError,
  RuntimeError,
  UndefinedWrite,
  StackOverflow,
  IncorectClosureBindings
} = require('../errors.js')

class Process {
  constructor (vm, pid) {
    this.vm = vm
    this.stack = new Stack()
    this.inbox = []
    this.pid = pid
    this.frame = {}
    this.finished = false
    this.waiting = false
    this.awaitingResponse = null
    this.accepting = false
    this.handler = null
    this.linkedProcesses = []
    this.handlingRequest = null
    this.timeout = null
    this.abandonedRequests = []
  }

  getStateDescriptor() {
    return {
      waiting: this.waiting,
      finished: this.finished,
      accepting: this.accepting,
      blocking: !!this.awaitingResponse,
      handling: !!this.handlingRequest
    }
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
      if (retval !== h('__ignore_return')) {
        retval !== undefined && this.frame.write(returnLocation, retval)
        this.incrementLine()
      }
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
    const args = [...additionalArgs, sender, ...payload]

    // This will push the handler frame to the stack
    this.bindNormalFunction(func, returnLocation, args)

    // It is the binding of the listener that constitutes the call
    // that when returned from, should increment the line counter.
    // Not the return from the listener
    this.frame.omittIncrement = true

    if (requiresResponse) {
      this.frame.returnCallback =
        (res) => {
          this.handlingRequest = null
          this.sendMessage({recipient: sender, payload: res, requestId: id})
        }
    }
  }

  bindNormalFunction(func, returnLocation, args, bindings) {
    if (func.argLocations.length !== args.length) {
      throw new ArgumentCountError(`Argument length mismatch calling ${func.functionId}. You gave me [${args}] but i need stuff to fill [${func.argLocations}]`)

    }
    const argData = {}

    func.argLocations.forEach((loc, i) => argData[loc] = args[i])

    if (this.stack.frames.length > 10000) {
      throw new StackOverflow()
    }

    const frame = new Frame(func, returnLocation, argData)

    if (func.unbound) {
      console.log(func.unbound)
      console.log(bindings)
      if (bindings.length === func.unbound.length) {
        func.unbound.forEach((name, i) => frame.write(name, bindings[i]))
      } else {
        throw new IncorectClosureBindings()
      }
    }

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
    }
  }

  setLine(line) {
    if (typeof line !== 'number') {
      throw new OddLineError(`Process ${this.pid} tried to jump to line ${line} which isnt even real`)
    }
    if (line >= this.frame.func.code.length) {
      this.frame.write('__return__', h('no_return'))
      this.returnFromFunction()
    } else {
      this.frame.line = line
    }
  }

  returnFromFunction() {
    const currentFrame = this.stack.frames.pop()
    const oldFrame = this.stack.frames.pop()

    if (!oldFrame) {
      this.finished = true
      if (currentFrame.deathHook) {
        this.sendMessage(currentFrame.deathHook)
      }
      return
    }

    const returnValue = currentFrame.read('__return__')
    oldFrame.write(currentFrame.resLocation, returnValue)
    currentFrame.returnCallback(returnValue, oldFrame)
    this.stack.frames.push(oldFrame)
    this.frame = oldFrame
    if ( !currentFrame.omittIncrement) {
      this.incrementLine()
    }
  }

  executeInstruction() {
    let instruction
    try {
      instruction = this.getCurrentInstruction()
      evaluateInstruction(this, instruction)
    } catch (err) {
      if (err instanceof RuntimeError) {
        if (this.linkedProcesses.length > 0 || this.inbox.length > 0 || this.handlingRequest) {
          const msg = err.message.split('').map(c => c.charCodeAt(0))
          this.linkedProcesses.forEach(linkedPid => {
            this.sendMessage({
              recipient: linkedPid,
              payload: [h('error'), err.errorAtom, msg, fromJsString(this.buildErrorMessage(err.message, instruction))]})
          })
          this.inbox.forEach(message => {
            if (message.requiresResponse) {
              this.sendMessage({
                recipient: message.sender,
                requestId: message.id,
                payload: [h('error'), err.errorAtom, msg, fromJsString(this.buildErrorMessage(err.message, instruction))]})
            }
          })
          if (this.handlingRequest) {
            this.sendMessage({
              recipient: this.handlingRequest.sender,
              requestId: this.handlingRequest.id,
              payload: [h('error'), err.errorAtom, msg, fromJsString(this.buildErrorMessage(err.message, instruction))]})
          }
          this.waiting = false
          this.finished = true
          if (this.stack.frames[0].deathHook) {
            this.sendMessage(this.stack.frames[0].deathHook)
          }
        } else {
          console.error(this.buildErrorMessage(err.message, instruction))
          //console.error('Frame:\n',this.frame.data, '\ninstruction:\n', instruction)
          throw err
        }
      } else {
        pretty(this.pid, this.frame.functionId, this.frame.line, instruction)
        console.log('Pesant error')
        console.log('This be our data:', this.buildErrorMessage(err.message, instruction, true))
        throw err
      }
    }
  }

  buildErrorMessage(msg, instruction, inspectFrame=false) {
    const stackTrace = this.stack.getStackTrace()
    return (
      '================================\n' +
      'An unhandled error occured!\n' +
      `${msg}\n` +
      `Running in process ${this.pid}\n` +
      `Evaluating line ${this.frame.line}: ${prettyInst(instruction)}\n`+
      `Stack trace\n${stackTrace}\n` +
      '================================\n')
  }

}

class Stack {
  constructor () {
    this.frames = []
  }

  addFrame (frame) {
    this.frames.push(frame)
  }

  getStackTrace() {
    return this.frames.slice(-5).map((frame) => `  ${frame.func.moduleName}:${frame.functionId}(${frame.line})`).reverse().join('\n')
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
    if (value === undefined && location !== '__dump__') {
      throw new UndefinedWrite(`Tried to write 'undefined' into ${location}`)
    }
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
