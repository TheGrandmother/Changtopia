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
  constructor(msg) {
    super(msg)
  }
}

class LocationInvalidError extends Error {
  constructor(msg) {
    super(`${msg} is not a valid location`)
  }
}



module.exports = {
  CodegenError,
  RuntimeError,
  LocationInvalidError,
  CompilerError
}
