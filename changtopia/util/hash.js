const XXH = require('xxhashjs')
// We have to use xxhashjs since cchash doesnt play with workers.
// If this is resolved we should switch back due to next level
// speed increase

const hash = (val) => {
  const hash = Number(XXH.h32(val.toString(), 0xcafebabe ))
  knownHashes[hash] = val
  return hash
}
const randomHash = () => hash((Math.random() * Number.MAX_SAFE_INTEGER).toString())

const resolveHash = (hash) => knownHashes[hash] || 'unknown'

const knownHashes = {}

const cheat = true

module.exports = {
  hash,
  h: cheat ? (v) => `$${v}` : hash,
  randomHash,
  resolveHash,
  knownHashes
}
