const grammar = require('./derp.js')
const {generate} = require('./intermediate.js')
const {generateCode} = require('./codegen.js')
const nearley = require('nearley')
const {inspect} = require('util')

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

const functions = parse(`
def bob(x)
a = 5
return 0
end
`)
console.log(inspect(functions, false, null, true))
const intermediateFunctions = generate(functions)
console.log(inspect(intermediateFunctions, false, null, true))


const compiledFunctions = Object.values(intermediateFunctions).map(generateCode)

console.log(inspect(compiledFunctions, false, null, true))
