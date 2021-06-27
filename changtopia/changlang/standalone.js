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
  .option('dry', {alias: 'd', description: 'Dont output anything but errors', type: 'boolean', default: false})
  .option('functions', {alias: 'f', description: 'Only print these functions, only works with -p or -n set', type: 'array', default: []})
  .argv

const inName = path.basename(argv._[0], '.chang')
let outPath
if (!argv.output) {
  outPath = './tbn_modules/' + inName + '.tbn'
} else {
  outPath = argv.output
}


const rawInput = fs.readFileSync(path.dirname(argv._[0]) + '/' + inName + '.chang').toString()

try {
  const _module = changpile(rawInput, {
    showAST: argv.a,
    showIntermediate: argv.n,
    prettyPrint: argv.p,
    showAmbigous: argv.s,
    printThese: argv.f
  })
  if (_module.intermediate) {
    console.log(_module.intermediate)
  }
  if (_module.pretty) {
    console.log(_module.pretty)
  }
  if (!argv.dry) {
    fs.writeFileSync(outPath, JSON.stringify(_module, undefined, 2))
  }
} catch (err) {
  if (!argv.v) {
    console.error(err.message)
  } else {
    throw err
  }
}
