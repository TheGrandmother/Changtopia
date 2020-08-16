const grammar = require('./compiled_grammar.js')
const {generateIntermediateCode} = require('./intermediate.js')
const {generateCode} = require('./codegen.js')
const {tailOptimize, dropRedundantMoves} = require('./optimize.js')
const nearley = require('nearley')
const {inspect} = require('util')
const {CompilerError} = require('../errors.js')

function parse(string, showAmbigous) {

  const parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar))

  let result
  try {
    result = parser.feed(string).results
  } catch (err) {
    if(err.token) {
      const newErr = new CompilerError(`Syntax Error: Unexpected token "${err.token.value.replace('\n', '\\n')}" at line ${err.token.line} col ${err.token.col}`)
      newErr.token = err.token
      throw newErr
    } else {
      // This is workaround until https://github.com/no-context/moo/pull/129 is merged
      if (err.stack.match(/.*moo\.js.*/)) {
        const m = err.message.match(/.*line (\d+) col (\d+)/)
        const newErr = new CompilerError(err.message)
        err.position = {line: parseInt(m[0]), col: parseInt(m[1])}
        throw newErr
      }
      throw err
    }
  }

  if (!result || result.length === 0) {
    console.error(result)
    throw new Error('Input didnt parse at all...')
  }

  if (result.length > 1) {
    const firstParse = JSON.stringify(result[0])
    const diffing = result.slice(1).some(res => JSON.stringify(res) !== firstParse)
    if (diffing) {
      throw new Error(`Ambigous parsing There were literally ${result.length} different parsings. ${showAmbigous && inspect(result, false, null, true)}`)
    } else {
      console.warn(`There were ${result.length} different but identical parsings... Incompetence thy name is the the dude who wrote this.`)
      if (showAmbigous) {
        console.log(`${inspect(result, false, null, true)}`)
      }
    }
  }

  if (!Array.isArray(result[0])) {
    return [result[0]]
  } else {
    return result[0]
  }

}

function pretty(functions) {
  return functions.reduce((acc, func) => {
    const {name, code} = func
    return `${acc}${name}:\n` + code.reduce((acc2, line, i) => {
      return(`${acc2}\t${i}:\t${line.id}\t${line.args.join(',\t')}\n`)
    }, '')
  }, '')
}

function changpile(_input, options = {}) {
  const {
    doTailOptimization = true,
    doMoveOptimization = false, //Diss dude be broken
    showAST = false,
    showIntermediate = false,
    prettyPrint = false,
    showAmbigous = false,
  } = options

  const input = _input.replace(/--.*$/mg,'')

  try {
    const functions = parse(input, showAmbigous)

    if (doTailOptimization) {
      functions.forEach(func => tailOptimize(func))
    }

    if (showAST) {
      return {ast: inspect(functions, false, null, true)}
    }

    const intermediateCode = generateIntermediateCode(functions)


    if (showIntermediate) {
      return {intermediate: inspect(intermediateCode, false, null, true)}
    }
    const compiledFunctions = {}

    if (doMoveOptimization) {
      Object.keys(intermediateCode.functions).forEach(name => intermediateCode.functions[name].body = dropRedundantMoves(intermediateCode.functions[name].body))
    }

    Object.keys(intermediateCode.functions).forEach(name => compiledFunctions[name] = generateCode(intermediateCode.functions[name], intermediateCode.moduleName))

    if (prettyPrint) {
      return {pretty: pretty(Object.values(compiledFunctions))}
    }

    return {...intermediateCode, functions: compiledFunctions, source: input.split('\n'), completed: true}
  } catch (err) {
    if (err.token || err.position) {
      if (!err.position) {
        err.position = {col: err.token.col, line: err.token.line}
      }
      err.preview = `${input.split('\n')[err.position.line - 1]}\n${'^'.padStart(err.position.col, ' ')}`
    }
    throw err
  }
}

module.exports = {changpile}
