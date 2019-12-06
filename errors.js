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



module.exports = {
  CodegenError,
  CompilerError
}
