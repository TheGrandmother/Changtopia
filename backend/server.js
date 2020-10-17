const {startMediator} = require('./mediator.js')
const express = require('express')
const fs = require('fs').promises
const cors = require('cors')
const config = require('../config.json')
const FileHandler = require('./fileHandler/fileHandler.js')

const app = express()
app.use(cors())
const port = config.server_port


async function loadSeedFiles() {
  const seedFiles = await fs.readdir('./seed_files')
  for (let file of seedFiles) {
    const content = (await fs.readFile('./seed_files/' + file)).toString()
    await FileHandler.storeFile(file.split(','), 'super_admin', content, {}, true)
  }
}

app.use(express.static(__dirname + '/public'))

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
    .catch(err => { console.log(err); res.json(err); res.status(500).send()})
})

app.get('/health', (req, res) => res.json('ok'))

loadSeedFiles().then(() => {
  app.listen(port, () => {
    startMediator()
    console.log(`Server up and listening on ${port}`)
  })
}).catch(err => console.error(err))
