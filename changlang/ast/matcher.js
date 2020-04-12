const helpers = require('./helpers')
const {randomHash} = require('../../util/hash.js')
const {makeBasicAssignmentNode, makeUnpackingAssignmentNode} = require('./assign')
const {makeUnpackNode} = require('./arrays')
const {makeBlockNode, makeIfNode, chainStatements, makeJumpNode} = require('./control')
const {makeExprNode} = require('./expr')
const {makeFunctionCallNode} = require('./functions')
const {makeConstantNode} = require('./basics')
const {inspect} = require('util')
console._log = (...args) => console.log(args.map(arg => inspect(arg, false,null,true)).join(' '))

function makeIdentifier(name) {
  return {
    type: 'identifier',
    name: name,
  }
}

function makeConstantClause(clause, resultName, doneLabel) {
  const compare = makeExprNode('==', resultName, clause.pattern)
  const body = makeBlockNode(clause.body, makeJumpNode(doneLabel))
  return makeIfNode(compare, body)

}

function makeImmediateClause(clause, resultName, doneLabel) {
  const clauseIdentifier = makeIdentifier(`array_${randomHash()}`)
  const assignArray = makeBasicAssignmentNode(clauseIdentifier.name, clause.pattern)
  const isArrayCall = makeFunctionCallNode('is_array', [resultName], 'bif')
  const arrayCompareCall = makeFunctionCallNode('array_compare', [resultName, clauseIdentifier], 'bif')
  return makeIfNode(isArrayCall, makeBlockNode(assignArray, makeIfNode(arrayCompareCall, makeBlockNode(clause.body, makeJumpNode(doneLabel)))))

}

function makeArrayClause(clause, resultName, doneLabel) {
  const clauseIdentifier = randomHash()
  const pattern = clause.pattern
  const hasBlob = !!pattern.entries.find(e => e.type === 'blob')
  const targetLength = pattern.entries.length - (hasBlob ? 1 : 0)

  const isArrayCall = makeFunctionCallNode('is_array', [resultName], 'bif')
  const lengthCall = makeFunctionCallNode('length', [resultName], 'bif')
  const compareLength = makeExprNode(hasBlob ? '>=' : '==', lengthCall, {type: 'constant', value: targetLength})


  // Faff around untill your eyes bleed
  const destructorEntries = pattern.entries.map((entry, i) => {
    if (entry.type !== 'identifier' && entry.type !== 'blob') {
      const conditionalIdent = makeIdentifier(`cond_entry_${i}_${clauseIdentifier}`)
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
    blob = destructorEntries[blobIndex]
    leading = destructorEntries.slice(0, blobIndex)
    trailing = destructorEntries.slice(blobIndex + 1)
  }
  const unpackNode = makeUnpackNode(leading, blob, trailing)
  const unpackAssignmentNode = makeUnpackingAssignmentNode(unpackNode, resultName)

  const checks = destructorEntries.filter(e => e.checkMe).map(e => {
    return makeExprNode('==', e, pattern.entries[e.checkAgainst])
  })

  //console.log(checks)
  const allChecksIdent = makeIdentifier(`all_checks_${clauseIdentifier}`)
  const setAllCheckedToTrue = makeBasicAssignmentNode(allChecksIdent.name, makeConstantNode(true, 'bool'))

  let deathNode
  if (checks.length > 0) {
    deathNode = makeExprNode('&&', allChecksIdent, checks[0])
    checks.slice(1).forEach(node => {
      deathNode = makeExprNode('&&', deathNode, node)
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
            )
          )
        )
      )
    )

  return theBigSad

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
    throw new Error(`The fuck is up with ${inspect(clause, false,null,true)}`)
  })
}

function makeMatcher(d) {
  d = helpers.wrapInArray(helpers.strip(d))
  const clauses = helpers.deepStrip(helpers.wrapInArray(helpers.strip(helpers.wrapInArray(d[2].flat())))).flat(Infinity)
  const expr = d[1]
  const matchIdentifier = randomHash()
  const exprResult = makeIdentifier(`match_expr_${matchIdentifier}`)
  const doneLabel = `match_done_${matchIdentifier}`
  const assignment = makeBasicAssignmentNode(exprResult.name, expr)
  const node = makeBlockNode(assignment, chainStatements(makeClauses(clauses, exprResult, doneLabel)))
  node.subType = 'matcher'
  node.doneLabel = doneLabel
  return node
}

function makeClause(d) {
  d = helpers.strip(d.flat())
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
