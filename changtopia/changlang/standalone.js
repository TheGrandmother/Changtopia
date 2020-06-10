const path = require('path')
const {changpile} = require('./compiler.js')
const fs = require('fs')
const argv = require('yargs')
  .option('ast-only', {alias: 'a', description: 'Display AST', type:'boolean', default: false})
  .option('intermediate', {alias: 'n', description: 'Display intermediate code', type: 'boolean', default: false})
  .option('input', {alias: 'i', description: 'Input file', type: 'string', default: 'in.chang'})
  .option('output', {alias: 'o', description: 'output file', type: 'string'})
  .option('machine', {alias: 'p', description: 'Print machinecode', type: 'boolean', default: false})
  .option('verbose', {alias: 'v', description: 'Print verbose errors', type: 'boolean', default: false})
  .option('no-optimize', {alias: 'k', description: 'Disable removal of redundant moves', type: 'boolean', default: false})
  .option('show-ambigous', {alias: 's', description: 'Show ambigous parsings', type: 'boolean', default: false})
  .argv

const inName = path.basename(argv.input, '.chang')
let outPath
if (!argv.output) {
  outPath = './tbn_modules/' + inName + '.tbn'
} else {
  outPath = argv.output
}


const rawInput = fs.readFileSync(path.dirname(argv.input) + '/' + inName + '.chang').toString()

const _module = changpile(rawInput, {
  showAST: argv.a,
  showIntermediate: argv.n,
  prettyPrint: argv.p,
  showAmbigous: argv.s,
})

fs.writeFileSync(outPath, JSON.stringify(_module, undefined, 2))
