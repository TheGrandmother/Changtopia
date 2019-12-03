const XXHash = require('xxhash')
const hash = (val) => XXHash.hash(Buffer.from(val.toString()), 0xcafebabe)
const randomHash = () => hash((Math.random() * Number.MAX_SAFE_INTEGER).toString())

module.exports = {
  hash,
  h: hash,
  randomHash
}
