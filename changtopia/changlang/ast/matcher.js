const helpers = require('./helpers')
const {randomHash} = require('../../util/hash.js')
const {CompilerError} = require('../../errors.js')
const {makeBasicAssignmentNode, makeUnpackingAssignmentNode} = require('./assign')
const {makeUnpackNode, makeIsArrayNode, makeArrayLengthNode} = require('./arrays')
const {makeBlockNode, makeIfNode, chainStatements, makeJumpNode, makeJumpIfFalseNode} = require('./control')
const {makeExprNode} = require('./expr')
const basic = require('./basics')
const {inspect} = require('util')
console._log = (...args) => console.log(args.map(arg => inspect(arg, false,null,true)).join(' '))

function makeConstantClause(clause, resultName, doneLabel) {
  const compare = makeExprNode('==', resultName, clause.pattern, clause.pos)
  const body = makeBlockNode(clause.body, makeJumpNode(doneLabel, clause.pos), clause.pos)
  return makeIfNode(compare, body, clause.pos)
}

function makeImmediateClause(clause, resultName, doneLabel) {
  const clauseIdentifier = basic.makeIdentifierNode(`array_${randomHash()}`, false, clause.pos)
  const assignArray = makeBasicAssignmentNode(clauseIdentifier.name, clause.pattern, clause.pos)
  const isArrayNode = makeIsArrayNode(resultName, clause.pos)
  const compareNode = makeExprNode('==', clauseIdentifier, resultName, clause.pos)
  return makeIfNode(isArrayNode,
    makeBlockNode(assignArray,
      makeIfNode(compareNode,
        makeBlockNode(clause.body,
          makeJumpNode(doneLabel, clause.pos))
        ,clause.pos)
    )
    , clause.pos)

}

function makeUnpacking(unpack, patternIdent, pos) {
  const leading = []
  const trailing = []
  let blob
  unpack.forEach(e => {
    if (e.type === 'blob') {
      blob = e.value
    } else if (!blob) {
      leading.push(e)
    } else {
      trailing.push(e)
    }
  })

  const unpackNode = makeUnpackNode(leading, blob, trailing, pos)
  return makeUnpackingAssignmentNode(unpackNode, patternIdent, pos)
}

function generateChecks(clauseIdentifier, pattern, patternIdent, skipLabel) {
  const pos = pattern.pos

  if (pattern.entries.filter(e => e.type === 'blob').length > 1) {
    throw new CompilerError(`Multiple blobs in matching pattern at line ${pos.line} col ${pos.col}`, pos)
  }

  let hasBlob = pattern.entries.filter(e => e.type === 'blob').length === 1

  const targetLength = pattern.entries.length - (hasBlob ? 1 : 0)

  const isArrayCall = makeIsArrayNode(patternIdent, pos)
  const lengthCall = makeArrayLengthNode(patternIdent, pos)
  const compareLength = makeExprNode(hasBlob ? '>=' : '==', lengthCall, {type: 'constant', value: targetLength, pos}, pos)

  const conditionals = []
  const subPatterns = []

  const unpack = pattern.entries.map((entry, i) => {
    if (entry.type === 'arrayLitteral') {
      const subIdent = basic.makeIdentifierNode(`sub_pattern_${i}_${clauseIdentifier}`, false, pos)
      subPatterns.push({ident: subIdent, node: entry})
      return subIdent
    } else if (entry.type !== 'identifier' && entry.type !== 'blob') {
      const conditionalIdent = basic.makeIdentifierNode(`cond_entry_${i}_${clauseIdentifier}`, false, pos)
      conditionals.push({ident: conditionalIdent, node: entry})
      return conditionalIdent
    } else {
      return entry
    }
  })

  const unpackAssign = makeUnpacking(unpack, patternIdent, pos)

  const checkerBlock = chainStatements([
    makeJumpIfFalseNode(isArrayCall, skipLabel.label, pos),
    makeJumpIfFalseNode(compareLength, skipLabel.label, pos),
    unpackAssign,
    ...conditionals.map(e => {
      const {ident, node} = e
      const {pos} = node
      const expr = makeExprNode('==', ident, node, pos)
      return makeJumpIfFalseNode(expr, skipLabel.label, pos)
    }),
    ...subPatterns.map(pattern => {
      const {ident, node} = pattern
      return generateChecks(clauseIdentifier, node, ident, skipLabel, node.pos)
    }).flat()
  ], pos)

  return checkerBlock

}

function makeArrayClause(clause, resultName, doneLabel) {
  const clauseIdentifier = randomHash()
  const pattern = clause.pattern
  const pos = clause.pos

  const skipLabel = basic.makeLabel(`skip_clause_${clauseIdentifier}`)

  const theBigFaff = generateChecks(clauseIdentifier, pattern, resultName, skipLabel, pos)

  const theSketchFest = chainStatements([
    theBigFaff,
    clause.body,
    makeJumpNode(doneLabel, pos),
    skipLabel
  ],pos)

  return theSketchFest

}

function makeIdentClause(clause, resultName, doneLabel) {
  return makeBlockNode(
    makeBasicAssignmentNode(clause.pattern.name, resultName, clause.pos),
    makeBlockNode(clause.body, makeJumpNode(doneLabel, clause.pos)),
    clause.pos
  )
}

function makeClauses(clauses, resultName, doneLabel) {

  return clauses.filter(clause => clause.type).map((clause) => {
    if (!clause.pos) {
      //For some reason some clauses don*t have a position, take the one fromt the patters
      clause.pos = clause.pattern.pos
    }
    if (clause.pattern.type === 'constant') {
      return makeConstantClause(clause, resultName, doneLabel)
    }
    if (clause.pattern.type === 'arrayLitteral') {
      return makeArrayClause(clause, resultName, doneLabel)
    }
    if (clause.pattern.type === 'arrayLitterallImmediate') {
      return makeImmediateClause(clause, resultName, doneLabel)
    }
    if (clause.pattern.type === 'identifier' && clause.pattern.name === 'whatever') {
      return makeBlockNode(clause.body, makeJumpNode(doneLabel, clause.pos))
    }
    if (clause.pattern.type === 'identifier') {
      return makeIdentClause(clause, resultName, doneLabel)
    }
    throw new Error(`The fuck is up with this clause: ${inspect(clause, false,null,true)}`)
  })
}

function makeMatcherNode(clauses, expr, pos) {
  const matchIdentifier = randomHash()
  const exprResult = basic.makeIdentifierNode(`match_expr_${matchIdentifier}`, false, pos)
  const doneLabel = `match_done_${matchIdentifier}`
  const assignment = makeBasicAssignmentNode(exprResult.name, expr, pos)
  const node = makeBlockNode(assignment, chainStatements(makeClauses(clauses, exprResult, doneLabel)), pos)
  node.subType = 'matcher'
  node.doneLabel = doneLabel
  return node

}

function makeMatcher(d) {
  const matchPos = helpers.findPositionOfToken(d, 'MATCH')
  d = helpers.strip(d)
  const clauses = helpers.deepStrip(helpers.wrapInArray(helpers.strip(helpers.wrapInArray(d[1].flat())))).flat(Infinity)
  const expr = d[0]
  return makeMatcherNode(clauses, expr, matchPos)
}

function makeClauseNode(pattern, body, pos) {
  return {
    type: 'clause',
    pattern,
    body,
    pos
  }
}

function makeClause(d) {
  d = helpers.deepStrip(d.flat())
  const pos = helpers.findPositionOfToken(d, 'CLAUSE')
  return makeClauseNode(helpers.strip(d[0]), d[1], pos)
}

module.exports = {
  makeMatcher,
  makeClause,
  makeMatcherNode,
  makeClauseNode
}
