function pretty(pid, functionId, line, inst) {
  if (inst) {
    console.log(`${pid}/${functionId}/${line}:\t${inst.id}\t${inst.args.join(',\t')}`)
  } else {
    console.log(`${pid}/${functionId}/${line}:\t instruction not known`)
  }
}

function prettyInst(inst) {
  return inst ? `${inst.id} ${inst.args.join(', ')}${inst.sourcePos ? `  (Line: ${inst.sourcePos.line} Column:${inst.sourcePos.col}` : ''})` : 'Instruction unkown'
}

module.exports = {
  pretty,
  prettyInst
}
