const fs = require('fs')
const process = require('process')

function prettify() {
  const [,, inFile] = process.argv
  const tbnFile = JSON.parse(fs.readFileSync(inFile))
  console.log(tbnFile)
}

prettify()
