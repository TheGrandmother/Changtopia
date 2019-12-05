const grammar = require('./derp.js')
const {generate} = require('./intermediate.js')
const {generateCode} = require('./codegen.js')
const nearley = require('nearley')
const {inspect} = require('util')
const process = require('process')
const fs = require('fs')

const parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar))

function parse(string) {
  const result = parser.feed(string).results
  if (result.length > 1) {
    throw new Error(`Ambigous parsing: ${inspect(result, false, null, true)}`)
  }

  if (!Array.isArray(result[0])) {
    return [result[0]]
  } else {
    return result[0]
  }

}

function pretty(code) {
  code.forEach((line, i) => {
    console.log(`${i}:\t${line.id}\t${line.args.join(',\t')}`)
  })
}

function compile() {
  console.log('seriously?', process.argv)
  const [,, inFile, outFile] = process.argv
  if (!inFile) {
    console.log(inFile)
    console.log('Usage: node compile.js inFile <outFile>')
  }

  const input = fs.readFileSync(inFile).toString()
  // console.log(input)
  const functions = parse(input)
  const intermediateFunctions = generate(functions)
  // console.log(inspect(intermediateFunctions, false, null, true))
  const compiledFunctions = Object.values(intermediateFunctions).map(generateCode)

  if (outFile) {
    fs.writeFileSync(outFile, JSON.stringify(compiledFunctions, undefined, 2))
  } else {
    console.log(inspect(compiledFunctions, false, null, true))
  }

  pretty(compiledFunctions[0])

}

compile()
