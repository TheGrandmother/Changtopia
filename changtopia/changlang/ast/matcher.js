const helpers = require('./helpers')
const {randomHash} = require('../../util/hash.js')
const {CompilerError} = require('../../errors.js')
const {makeBasicAssignmentNode, makeUnpackingAssignmentNode} = require('./assign')
const {makeUnpackNode} = require('./arrays')
const {makeBlockNode, makeIfNode, chainStatements, makeJumpNode} = require('./control')
const {makeExprNode} = require('./expr')
const {makeFunctionCallNode} = require('./functions')
const basic = require('./basics')
const {inspect} = require('util')
console._log = (...args) => console.log(args.map(arg => inspect(arg, false,null,true)).join(' '))

function makeConstantClause(clause, resultName, doneLabel) {
  const compare = makeExprNode('==', resultName, clause.pattern, clause.pos)
  const body = makeBlockNode(clause.body, makeJumpNode(doneLabel), clause.pos)
  return makeIfNode(compare, body, clause.pos)
}

function makeImmediateClause(clause, resultName, doneLabel) {
  const clauseIdentifier = basic.makeIdentifierNode(`array_${randomHash()}`, false, clause.pos)
  const assignArray = makeBasicAssignmentNode(clauseIdentifier.name, clause.pattern)
  const isArrayCall = makeFunctionCallNode('is_array', [resultName], 'bif')
  const arrayCompareCall = makeFunctionCallNode('array_compare', [resultName, clauseIdentifier], 'bif')
  return makeIfNode(isArrayCall, makeBlockNode(assignArray, makeIfNode(arrayCompareCall, makeBlockNode(clause.body, makeJumpNode(doneLabel)))))

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

function jumpIfFalse(cond, label, pos) {
  return makeIfNode(
    makeExprNode('==', cond, {type: 'constant', value: false}, pos),
    makeJumpNode(label.label, pos)
  )
}

function generateChecks(clauseIdentifier, pattern, patternIdent, skipLabel) {
  const pos = pattern.pos

  if (pattern.entries.filter(e => e.type === 'blob').length > 1) {
    throw new CompilerError(`Multiple blobs in matching pattern at line ${pos.line} col ${pos.col}`, pos)
  }

  let hasBlob = pattern.entries.filter(e => e.type === 'blob').length === 1

  const targetLength = pattern.entries.length - (hasBlob ? 1 : 0)

  const isArrayCall = makeFunctionCallNode('is_array', [patternIdent], 'bif', pos)
  const lengthCall = makeFunctionCallNode('length', [patternIdent], 'bif', pos)
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
    jumpIfFalse(isArrayCall, skipLabel, pos),
    jumpIfFalse(compareLength, skipLabel, pos),
    unpackAssign,
    ...conditionals.map(e => {
      const {ident, node} = e
      const {pos} = node
      const expr = makeExprNode('==', ident, node, pos)
      return jumpIfFalse(expr, skipLabel, pos)
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

//function makeArrayClause(clause, resultName, doneLabel) {
//  const clauseIdentifier = randomHash()
//  const pattern = clause.pattern
//  const pos = clause.pos
//  const hasBlob = !!pattern.entries.find(e => e.type === 'blob')
//  const targetLength = pattern.entries.length - (hasBlob ? 1 : 0)
//
//  const skipLabel = basic.makeLabel(`skip_clause_${clauseIdentifier}`)
//
//  const isArrayCall = makeFunctionCallNode('is_array', [resultName], 'bif')
//  const lengthCall = makeFunctionCallNode('length', [resultName], 'bif')
//  const compareLength = makeExprNode(hasBlob ? '>=' : '==', lengthCall, {type: 'constant', value: targetLength})
//
//  // Faff around untill your eyes bleed
//  const destructorEntries = pattern.entries.map((entry, i) => {
//    if (entry.type === 'arrayLitteral') {
//      //Okay...
//    } else if (entry.type !== 'identifier' && entry.type !== 'blob') {
//      const conditionalIdent = basic.makeIdentifierNode(`cond_entry_${i}_${clauseIdentifier}`, false, pos)
//      conditionalIdent.checkAgainst = i
//      conditionalIdent.checkMe = true
//      return conditionalIdent
//    } else {
//      return entry
//    }
//  })
//
//  const blobIndex = destructorEntries.findIndex(e => e.type === 'blob')
//  let leading, trailing, blob
//  if (blobIndex === -1) {
//    leading = destructorEntries
//    trailing = []
//  } else {
//    blob = destructorEntries[blobIndex].value
//    leading = destructorEntries.slice(0, blobIndex)
//    trailing = destructorEntries.slice(blobIndex + 1)
//  }
//  const unpackNode = makeUnpackNode(leading, blob, trailing, pos)
//  const unpackAssignmentNode = makeUnpackingAssignmentNode(unpackNode, resultName, pos)
//
//  const checks = destructorEntries.filter(e => e.checkMe).map(e => {
//    return makeExprNode('==', e, pattern.entries[e.checkAgainst])
//  })
//
//  const allChecksIdent = basic.makeIdentifierNode(`all_checks_${clauseIdentifier}`, false, pos)
//  const setAllCheckedToTrue = makeBasicAssignmentNode(allChecksIdent.name, basic.makeConstantNode(true, 'bool'), pos)
//
//  let deathNode
//  if (checks.length > 0) {
//    deathNode = makeExprNode('&&', allChecksIdent, checks[0], pos)
//    checks.slice(1).forEach(node => {
//      deathNode = makeExprNode('&&', deathNode, node, pos)
//    })
//  } else {
//    deathNode = allChecksIdent
//  }
//
//  const theBigSad =
//    makeIfNode(isArrayCall,
//      makeIfNode(compareLength,
//        makeBlockNode(chainStatements([unpackAssignmentNode, setAllCheckedToTrue]),
//          makeIfNode(deathNode,
//            makeBlockNode(clause.body,
//              makeJumpNode(doneLabel)
//              ,pos)
//            ,pos)
//          ,pos)
//        ,pos)
//      ,pos)
//
//  return theBigSad
//
//}

function makeIdentClause(clause, resultName, doneLabel) {
  return makeBlockNode(
    makeBasicAssignmentNode(clause.pattern.name, resultName),
    makeBlockNode(clause.body, makeJumpNode(doneLabel)),
    clause.pos
  )
}

function makeClauses(clauses, resultName, doneLabel) {

  return clauses.filter(clause => clause.type).map((clause) => {
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
      return makeBlockNode(clause.body, makeJumpNode(doneLabel))
    }
    if (clause.pattern.type === 'identifier') {
      return makeIdentClause(clause, resultName, doneLabel)
    }
    throw new Error(`The fuck is up with this clause: ${inspect(clause, false,null,true)}`)
  })
}

function makeMatcher(d) {
  const matchPos = helpers.findPositionOfToken(d, 'MATCH')
  d = helpers.strip(d)
  const clauses = helpers.deepStrip(helpers.wrapInArray(helpers.strip(helpers.wrapInArray(d[1].flat())))).flat(Infinity)
  const expr = d[0]
  const matchIdentifier = randomHash()
  const exprResult = basic.makeIdentifierNode(`match_expr_${matchIdentifier}`, false, matchPos)
  const doneLabel = `match_done_${matchIdentifier}`
  const assignment = makeBasicAssignmentNode(exprResult.name, expr, matchPos)
  const node = makeBlockNode(assignment, chainStatements(makeClauses(clauses, exprResult, doneLabel)), matchPos)
  node.subType = 'matcher'
  node.doneLabel = doneLabel
  return node
}

function makeClause(d) {
  d = helpers.deepStrip(d.flat())
  return {
    type: 'clause',
    pattern: helpers.strip(d[0]),
    body: d[1]
  }

}

module.exports = {
  makeMatcher,
  makeClause
}
