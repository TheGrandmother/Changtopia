const grammar = require('./derp.js')
const nearley = require('nearley')
const {inspect} = require('util')

const parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar))

console.log('made parser, starting parsing')

console.log(inspect(parser.feed('a = 5').results, false, null, true))
//console.log(inspect(parser.feed('def bob (anus) \n 7 \n end').results, false, null, true))
//console.log(inspect(parser.feed('def  (anus) \n 7 \n end').results, false, null, true))
