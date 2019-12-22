const {h} = require('./util/hash.js')

class CompilerError extends Error {
  constructor(msg) {
    super(msg)
  }
}

class CodegenError extends CompilerError {
  constructor(msg) {
    super(msg)
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
    super(msg, h('name_space_error'))
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
  NameSpaceError
}
