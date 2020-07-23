const helpers = require('./helpers')
const {randomHash} = require('../../util/hash.js')
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

function makeArrayClause(clause, resultName, doneLabel) {
  const clauseIdentifier = randomHash()
  const pattern = clause.pattern
  const pos = clause.pos
  const hasBlob = !!pattern.entries.find(e => e.type === 'blob')
  const targetLength = pattern.entries.length - (hasBlob ? 1 : 0)

  const isArrayCall = makeFunctionCallNode('is_array', [resultName], 'bif')
  const lengthCall = makeFunctionCallNode('length', [resultName], 'bif')
  const compareLength = makeExprNode(hasBlob ? '>=' : '==', lengthCall, {type: 'constant', value: targetLength})


  // Faff around untill your eyes bleed
  const destructorEntries = pattern.entries.map((entry, i) => {
    if (entry.type !== 'identifier' && entry.type !== 'blob') {
      const conditionalIdent = basic.makeIdentifierNode(`cond_entry_${i}_${clauseIdentifier}`, false, pos)
      conditionalIdent.checkAgainst = i
      conditionalIdent.checkMe = true
      return conditionalIdent
    } else {
      return entry
    }
  })
  //console.log('destructorEntries:', destructorEntries)
  const blobIndex = destructorEntries.findIndex(e => e.type === 'blob')
  let leading, trailing, blob
  if (blobIndex === -1) {
    leading = destructorEntries
    trailing = []
  } else {
    blob = destructorEntries[blobIndex].value
    leading = destructorEntries.slice(0, blobIndex)
    trailing = destructorEntries.slice(blobIndex + 1)
  }
  const unpackNode = makeUnpackNode(leading, blob, trailing, pos)
  const unpackAssignmentNode = makeUnpackingAssignmentNode(unpackNode, resultName, pos)

  const checks = destructorEntries.filter(e => e.checkMe).map(e => {
    return makeExprNode('==', e, pattern.entries[e.checkAgainst])
  })

  //console.log(checks)
  const allChecksIdent = basic.makeIdentifierNode(`all_checks_${clauseIdentifier}`, false, clause.pos)
  const setAllCheckedToTrue = makeBasicAssignmentNode(allChecksIdent.name, basic.makeConstantNode(true, 'bool'), pos)

  let deathNode
  if (checks.length > 0) {
    deathNode = makeExprNode('&&', allChecksIdent, checks[0], pos)
    checks.slice(1).forEach(node => {
      deathNode = makeExprNode('&&', deathNode, node, pos)
    })
  } else {
    deathNode = allChecksIdent
  }

  const theBigSad =
    makeIfNode(isArrayCall,
      makeIfNode(compareLength,
        makeBlockNode(chainStatements([unpackAssignmentNode, setAllCheckedToTrue]),
          makeIfNode(deathNode,
            makeBlockNode(clause.body,
              makeJumpNode(doneLabel)
              ,pos)
            ,pos)
          ,pos)
        ,pos)
      ,pos)

  return theBigSad

}

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
