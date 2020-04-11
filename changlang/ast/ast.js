const {inspect} = require('util')
const _log = console.log
console._log = (...args) => _log(args.map(arg => inspect(arg, false,null,true)).join(' '))

const listsAndTuples = require('./listsAndTuples')
const arrays = require('./arrays')
const functions = require('./functions')
const helpers = require('./helpers')
const matcher = require('./matcher')
const control = require('./control')
const assign = require('./assign')
const expr = require('./expr')
const basics = require('./basics')

// TODO: All of this is an inconsistent mess. Refactor this at some point

/*
 * ==================================
 * HELPERS
 * ==================================
 */

function makeExpr(d) {
  return helpers.dropArray(helpers.strip(d))
}

module.exports = {
  makeExpr,
  ...listsAndTuples,
  ...helpers,
  ...functions,
  ...arrays,
  ...matcher,
  ...control,
  ...assign,
  ...expr,
  ...basics
}
