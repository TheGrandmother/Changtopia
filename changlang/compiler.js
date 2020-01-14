const grammar = require('./compiled_grammar.js')
const process = require('process')
const {generateIntermediateCode} = require('./intermediate.js')
const {generateCode} = require('./codegen.js')
const nearley = require('nearley')
const {inspect} = require('util')
const fs = require('fs')
const argv = require('yargs')
  .option('ast-only', {alias: 'a', description: 'Display AST', type:'boolean', default: false})
  .option('intermediate', {alias: 'n', description: 'Display intermediate code', type: 'boolean', default: false})
  .option('input', {alias: 'i', description: 'Input file', type: 'string', default: 'in.chang'})
  .option('output', {alias: 'o', description: 'output file', type: 'string', default: 'out.tbn'})
  .option('machine', {alias: 'p', description: 'Print machinecode', type: 'boolean', default: false})
  .option('verbose', {alias: 'v', description: 'Print verbose errors', type: 'boolean', default: false})
  .argv

const parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar))

function parse(string) {
  const result = parser.feed(string).results
  if (!result || result.length === 0) {
    throw new Error('Input didnt parse at all...')
  }

  if (result.length > 1) {
    const firstParse = JSON.stringify(result[0])
    const diffing = result.slice(1).some(res => JSON.stringify(res) !== firstParse)
    if (diffing) {
      throw new Error(`Ambigous parsing There were literally ${result.length} different parsings. ${argv.v && inspect(result, false, null, true)}`)
    } else {
      console.warn(`There were ${result.length} different but identical parsings... Incompetence thy name is the the dude who wrote this.`)
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

function compile() {

  const input = fs.readFileSync(argv.input).toString()

  const functions = parse(input)
  if (argv.a) {
    console.log('AST:')
    console.log(inspect(functions, false, null, true))
    process.exit(0)
  }

  const intermediateCode = generateIntermediateCode(functions)

  if (argv.n) {
    console.log(inspect(intermediateCode, false, null, true))
  }
  const compiledFunctions = {}
  Object.keys(intermediateCode.functions).forEach(name => compiledFunctions[name] = generateCode(intermediateCode.functions[name]))

  fs.writeFileSync(argv.output, JSON.stringify({...intermediateCode, functions: compiledFunctions}, undefined, 2))

  if (argv.p) {
    pretty(Object.values(compiledFunctions))
  }


}

compile()
