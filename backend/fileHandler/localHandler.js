const fs = require('fs').promises

const BASE_PATH = 'file_store'

fs.mkdir(BASE_PATH).catch(err => {
  if (err.code === 'EEXIST') {
    return
  }
  throw err
})

async function getFile(path) {
  return (await fs.readFile(`${BASE_PATH}/${path.join(',')}`)).toString()
}

async function writeFile(path, content) {
  await fs.writeFile(`${BASE_PATH}/${path.join(',')}`, content)
}

async function fileExists(path) {
  try {
    await fs.stat(`${BASE_PATH}/${path.join(',')}`)
    return true
  } catch (err) {
    if (err.code === 'ENOENT') {
      return false
    }
    else throw err
  }
}

async function listFiles(path) {
  const regex = new RegExp(path.join(',') + '.*^', 'g')
  const files = await fs.readdir(BASE_PATH)
  return files.filter(f => !!f.match(regex))
}

module.exports = {
  getFile,
  writeFile,
  fileExists,
  listFiles
}
