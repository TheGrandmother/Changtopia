const mediator = require('./mediator.js')
const express = require('express')
const fs = require('fs').promises
const cors = require('cors')

const app = express()
app.use(cors())
const port = 9000

app.get('/get_dem_files', (req, res) => {
  async function loadAndCompile() {
    const changfilePath = '../changtopia/changfiles'
    const filePaths = await fs.readdir(changfilePath)
    const moduleFiles = filePaths.filter(path => /.*\.chang$/.test(path))
    const files = {}
    for (let file of moduleFiles) {
      files[file] = (await fs.readFile(changfilePath + '/' + file)).toString()
    }
    return files
  }
  loadAndCompile()
    .then((modules) => {res.json(modules)})
    .catch(err => {console.log(err); res.json(err); res.status(500).send()})
})

app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`))
