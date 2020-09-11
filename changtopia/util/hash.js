const XXH = require('xxhashjs')
// We have to use xxhashjs since cchash doesnt play with workers.
// If this is resolved we should switch back due to next level
// speed increase

const hash = (val) => {
  const hash = Number(XXH.h32(val.toString(), 0xcafebabe ))
  return hash
}
const randomHash = () => (Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)).toString(16).slice(-8)

const cheat = true

module.exports = {
  hash,
  h: cheat ? (v) => `$${v}` : hash,
  randomHash
}
