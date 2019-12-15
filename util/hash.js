const XXH = require('xxhashjs')
// We have to use xxhashjs since cchash doesnt play with workers.
// If this is resolved we should switch back due to next level
// speed increase

const hash = (val) => Number(XXH.h32(val.toString(), 0xcafebabe ))
const randomHash = () => hash((Math.random() * Number.MAX_SAFE_INTEGER).toString())

module.exports = {
  hash,
  h: hash,
  randomHash
}
