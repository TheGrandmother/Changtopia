function pretty(pid, functionId, line, inst) {
  console.log(`${pid}/${functionId}/${line}:\t${inst.id}\t${inst.args.join(',\t')}`)
}

module.exports = {
  pretty
}
