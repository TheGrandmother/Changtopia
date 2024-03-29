const {h} = require('./util/hash.js')


class CompilerError extends Error {
  constructor(msg) {
    super(msg)
  }
}

class CodegenError extends CompilerError {
  constructor(msg, position) {
    super(msg)
    if (position) {
      this.position = position
    }
  }
}

class RuntimeError extends Error {
  constructor(msg, errorAtom) {
    super(msg)
    this.errorAtom = errorAtom
  }
}


class LocationInvalidError extends RuntimeError {
  constructor(msg) {
    super(`${msg} is not a valid location`, h('location_error'))
  }
}

class IncorectClosureBindings extends RuntimeError {
  constructor() {
    super('Incorect number of bindings received', h('location_error'))
  }
}

class StackOverflow extends RuntimeError {
  constructor() {
    super('Bro... chill it with the fucking recursion.', h('stack_overflow'))
  }
}

class LocationEmptyError extends RuntimeError {
  constructor(msg) {
    super(`There is no data at location ${msg}`, h('location_empty'))
  }
}

class ArrayIndexError extends RuntimeError {
  constructor(msg) {
    super(msg, h('array_index_error'))
  }
}

class ArrayTypeError extends RuntimeError {
  constructor(msg) {
    super(msg, h('array_type_error'))
  }
}

class StrangeInstructionError extends RuntimeError {
  constructor(msg) {
    super(msg, h('strange_instruction_error'))
  }
}

class UnknownFunctionError extends RuntimeError {
  constructor(msg) {
    super(msg, h('unkown_function_error'))
  }
}

class UnknownModuleError extends RuntimeError {
  constructor(msg) {
    super(msg, h('unknown_module_error'))
  }
}

class ArgumentCountError extends RuntimeError {
  constructor(msg) {
    super(msg, h('argument_count_error'))
  }
}

class NoSuchPidError extends RuntimeError {
  constructor(msg) {
    super(msg, h('no_such_pid_error'))
  }
}

class OddLineError extends RuntimeError {
  constructor(msg) {
    super(msg, h('odd_line_error'))
  }
}

class NameSpaceError extends RuntimeError {
  constructor(msg) {
    super(msg, h('namespace_error'))
  }
}

class UnknownInstance extends RuntimeError {
  constructor(msg) {
    super(msg, h('unknown_instance'))
  }
}

class MallformedPid extends RuntimeError {
  constructor(msg) {
    super(msg, h('mallformed_pid'))
  }
}

class UndefinedWrite extends RuntimeError {
  constructor(msg) {
    super(msg, h('undefined_write'))
  }
}

class NaNValue extends RuntimeError {
  constructor(msg) {
    super(msg, h('nan_value'))
  }
}

class StupidMath extends RuntimeError {
  constructor(msg) {
    super(msg, h('stupid_math'))
  }
}

module.exports = {
  CodegenError,
  RuntimeError,
  LocationInvalidError,
  CompilerError,
  ArrayIndexError,
  ArrayTypeError,
  StrangeInstructionError,
  UnknownFunctionError,
  ArgumentCountError,
  NoSuchPidError,
  OddLineError,
  NameSpaceError,
  UnknownModuleError,
  LocationEmptyError,
  UnknownInstance,
  MallformedPid,
  UndefinedWrite,
  StackOverflow,
  IncorectClosureBindings,
  StupidMath,
  NaNValue
}
