const grammar = require('./derp.js')
const {generate} = require('./codegen.js')
const nearley = require('nearley')
const {inspect} = require('util')

const parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar))

console.log('made parser, starting parsing')

//console.log(inspect(parser.feed('def bob (anus) \n 7 \n end').results, false, null, true))
//console.log(inspect(parser.feed('def  (anus) \n 7 \n end').results, false, null, true))

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
if 1 + 2
a = 5
end
return a + 9
end
`)
console.log(inspect(functions, false, null, true))
const code = generate(functions)
console.log(inspect(code, false, null, true))
