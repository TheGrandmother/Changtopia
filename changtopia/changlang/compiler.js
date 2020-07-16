const grammar = require('./compiled_grammar.js')
const {generateIntermediateCode} = require('./intermediate.js')
const {generateCode} = require('./codegen.js')
const {tailOptimize, dropRedundantMoves} = require('./optimize.js')
const nearley = require('nearley')
const {inspect} = require('util')

function parse(string, showAmbigous) {
  const parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar))
  const result = parser.feed(string).results
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
  functions.forEach((func) => {
    const {name, code} = func
    console.log(`${name}:`)
    console.group()
    code.forEach((line, i) => {
      console.log(`${i}:\t${line.id}\t${line.args.join(',\t')}`)
    })
    console.groupEnd()
  })
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

  const functions = parse(input, showAmbigous)

  if (doTailOptimization) {
    functions.forEach(func => tailOptimize(func))
  }

  if (showAST) {
    console.log('==============================AST================================')
    console.log(inspect(functions, false, null, true))
  }

  const intermediateCode = generateIntermediateCode(functions)


  if (showIntermediate) {
    console.log('=========================INTERMEDIATE============================')
    console.log(inspect(intermediateCode, false, null, true))
  }
  const compiledFunctions = {}

  if (doMoveOptimization) {
    Object.keys(intermediateCode.functions).forEach(name => intermediateCode.functions[name].body = dropRedundantMoves(intermediateCode.functions[name].body))
  }

  Object.keys(intermediateCode.functions).forEach(name => compiledFunctions[name] = generateCode(intermediateCode.functions[name], intermediateCode.moduleName))

  if (prettyPrint) {
    console.log('============================CODE================================')
    pretty(Object.values(compiledFunctions))
  }

  return {...intermediateCode, functions: compiledFunctions}
}

module.exports = {changpile}
