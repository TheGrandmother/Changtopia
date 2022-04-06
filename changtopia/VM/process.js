const {randomHash, h} = require('../util/hash')
const {fromJsString} = require('../util/strings.js')
const {evaluateInstruction} = require('./instructions/ops.js')
const {pretty, prettyInst} = require('./instructions/pretty.js')
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
    this.metrics = {
      core: {
      },
      calls: {
      }
    }
    this.coreCallsSinceLastReport = 0
    this.callsSinceLastReport = 0
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
      throw new UnknownFunctionError(`Bro we, the module ${module}, have litterally no function called ${functionId}`)
    }
    return func
  }

  bindFunction (module, functionId, returnLocation, args, bindings) {
    const {enableMetrics, metricsSampleRate} = this.vm
    let start
    const func = this.getFunction(module, functionId)
    if (module === 'core') {

      if (enableMetrics) {
        start = performance.now()
      }

      const retval = func.exec(this, returnLocation, ...args)
      if (retval !== h('__ignore_return')) {
        retval !== undefined && this.frame.write(returnLocation, retval)
        this.incrementLine()
      }

      if (enableMetrics) {
        const current = this.metrics.core[functionId] = {
          calls: 0,
          time: 0,
          ...this.metrics.core[functionId]
        }
        this.metrics.core[functionId] = {
          calls: current.calls + 1,
          time: current.time + (performance.now() - start),
        }
        this.coreCallsSinceLastReport += 1
        if(this.coreCallsSinceLastReport >= 1000 / metricsSampleRate) {
          this.coreCallsSinceLastReport  = 0
          this.vm.postMetrics('core', this.metrics.core)
          this.metrics.core = {}
        }
      }

    } else {
      this.bindNormalFunction(func, returnLocation, args, bindings)
    }

  }

  bindNormalFunction(func, returnLocation, args, bindings) {
    const {enableMetrics} = this.vm

    const argData = {}

    if (enableMetrics) {
      const metricKey = `${func.moduleName}:${func.functionId}`
      this.metrics.calls[metricKey] = {
        calls: 0,
        time: 0,
        ...this.metrics.calls[metricKey]
      }
      this.callsSinceLastReport += 1
      this.metrics.calls[metricKey].calls += 1
    }

    if (func.matchyBoi) {
      const [loc] = func.argLocations
      argData[loc] = args
    } else {
      if (func.argLocations.length !== args.length) {
        throw new ArgumentCountError(`Argument length mismatch calling ${func.functionId}. You gave me [${args}] but i need stuff to fill [${func.argLocations}]`)
      }
      func.argLocations.forEach((loc, i) => argData[loc] = args[i])
    }

    if (this.stack.frames.length > 10000) {
      throw new StackOverflow()
    }

    const frame = new Frame(func, returnLocation, argData)

    if (func.unbound) {
      if (bindings.length === func.unbound.length) {
        func.unbound.forEach((name, i) => {
          if (bindings[i] === h('__SELF__')) {
            frame.write(name, [fromJsString(func.moduleName), fromJsString(func.functionId), ...bindings])
          } else {
            frame.write(name, bindings[i])
          }
        })
      } else {
        throw new IncorectClosureBindings()
      }
    }

    this.stack.addFrame(frame)
    this.frame = frame
  }

  listen(module, functionId, returnLocation, additionalArgs, bindings) {
    const func = this.getFunction(module, functionId)
    this.handler = {func, returnLocation, additionalArgs, bindings}
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
          break
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

    this.vm.dispatchMessage(message)
  }

  bindHandlerFunction(message) {
    const {id, sender, payload, requiresResponse} = message
    if(requiresResponse) {
      this.handlingRequest = {sender, id}
    }

    const {func, returnLocation, additionalArgs, bindings} = this.handler
    const args = [...additionalArgs, sender, ...payload]

    // This will push the handler frame to the stack
    this.bindNormalFunction(func, returnLocation, args, bindings)

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
    const {enableMetrics, metricsSampleRate} = this.vm

    const currentFrame = this.stack.frames.pop() // Returning from frame
    const oldFrame = this.stack.frames.pop()     // To frame

    if (!oldFrame) {
      if (!this.waiting) {
        this.finished = true
        if (currentFrame.deathHook) {
          this.sendMessage(currentFrame.deathHook)
        }
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

    if (enableMetrics) {
      if (this.callsSinceLastReport > 1000 / metricsSampleRate) {
        this.callsSinceLastReport = 0
        this.vm.postMetrics('calls', this.metrics.calls)
        this.metrics.calls = {}
      }
    }
  }

  executeInstruction() {
    let instruction
    const {enableMetrics} = this.vm
    let start
    try {
      if (enableMetrics) {
        start = performance.now()
      }

      instruction = this.getCurrentInstruction()
      evaluateInstruction(this, instruction)
      if (enableMetrics) {
        const metricsKey = `${this.frame.func.moduleName}:${this.frame.func.functionId}`
        if (this.metrics.calls[metricsKey]) {
          this.metrics.calls[metricsKey].time += performance.now() - start
        } else {
          this.metrics.calls[metricsKey] = {
            calls: 1,
            time: performance.now() - start
          }
        }
      }
    } catch (err) {
      if (err instanceof RuntimeError) {
        let errorMessage
        try {
          errorMessage = this.buildErrorMessage(err.message, instruction)
        } catch (annoyingError){
          //An error during the building of the error message will hide the true error
          console.error('Error in error builder')
          console.error(annoyingError)
          console.error('original message')
          console.error(err)
          throw annoyingError
        }
        console.error(errorMessage)
        if (this.linkedProcesses.length > 0 || this.inbox.length > 0 || this.handlingRequest) {
          const msg = err.message.split('').map(c => c.charCodeAt(0))
          this.linkedProcesses.forEach(linkedPid => {
            console.log(`passign error onto ${JSON.stringify(linkedPid)}`)
            this.sendMessage({
              recipient: linkedPid,
              payload: [[h('error'), err.errorAtom, msg, fromJsString(errorMessage)]]})
          })
          this.inbox.forEach(message => {
            if (message.requiresResponse) {
              this.sendMessage({
                recipient: message.sender,
                requestId: message.id,
                payload: [[h('error'), err.errorAtom, msg, fromJsString(errorMessage)]]})
            }
          })
          if (this.handlingRequest) {
            this.sendMessage({
              recipient: this.handlingRequest.sender,
              requestId: this.handlingRequest.id,
              payload: [[h('error'), err.errorAtom, msg, fromJsString(errorMessage)]]})
          }
          this.waiting = false
          this.finished = true
          if (this.stack.frames[0].deathHook) {
            this.sendMessage(this.stack.frames[0].deathHook)
          }
        } else {
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

  buildErrorMessage(msg, instruction) {
    const stackTrace = this.stack.getStackTrace(this.vm)
    return (
      '================================\n' +
      `An unhandled error occured in process ${this.pid}\n` +
      `${msg}\n` +
      '\n' +
      `Instruction: ${prettyInst(instruction)}\n`+
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

  replaceFrame (frame) {
    this.frames.pop()
    this.frames.push(frame)
  }

  getStackTrace(vm) {
    let trace = this.frames.slice(-5).map((frame) => {
      const line = frame.func.code[frame.line]?.sourcePos?.line || '??'
      const source = vm?.getModule(frame.func.moduleName)?.source[line - 1]?.trim() || 'Source not reachable'
      return `  ${frame.func.moduleName}:${frame.functionId}:${line}   ${source}`
    }).reverse().join('\n')
    if (this.frames.length > 5) {
      trace = `${trace}\n  (${this.frames.length - 5} frames hidden)`
    }
    return trace
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
      throw new UndefinedWrite(`Tried to write an undefined value into ${location}`)
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
