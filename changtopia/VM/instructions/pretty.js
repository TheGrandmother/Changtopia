function pretty(pid, functionId, line, inst) {
  if (inst) {
    console.log(`${pid}/${functionId}/${line}:  ${inst.id}  ${inst.args.join(',  ')}`)
  } else {
    console.log(`${pid}/${functionId}/${line}:   instruction not known`)
  }
}

function prettyInst(inst) {
  return inst ? `${inst.id} ${inst.args.join(', ')}${inst.sourcePos ? `  (Line: ${inst.sourcePos.line} Column:${inst.sourcePos.col}` : ''})` : 'Instruction unkown'
}

module.exports = {
  pretty,
  prettyInst
}
