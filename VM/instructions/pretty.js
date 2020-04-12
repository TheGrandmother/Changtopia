function pretty(pid, functionId, line, inst) {
  if (inst) {
    console.log(`${pid}/${functionId}/${line}:\t${inst.id}\t${inst.args.join(',\t')}`)
  } else {
    console.log(`${pid}/${functionId}/${line}:\t instruction not known`)
  }
}

module.exports = {
  pretty
}
