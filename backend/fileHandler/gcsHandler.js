const {Storage} = require('@google-cloud/storage')
const config = require('../../config.json')
const fs = require('fs').promises

class GcsError extends (Error) {}

const storage = new Storage()

const bucketName = config.gcs_bucket

const TEMP_PATH = 'tmp_store'

fs.mkdir(TEMP_PATH).catch(err => {
  if (err.code === 'EEXIST') {
    return
  }
  throw err
})

async function makeTempFile(content) {
  const path = TEMP_PATH + '/' + (Math.random() * Number.MAX_SAFE_INTEGER).toString(16)
  await fs.writeFile(path, content || '')
  return path
}

async function deleteTempFile(path) {
  await fs.unlink(path)

}

async function getFile(path) {
  const [content] = await storage.bucket(bucketName).file(path.join(',')).download()
  return content.toString()
}

async function writeFile(path, content) {
  const tmpPath = await makeTempFile(content)
  try {
    await storage.bucket(bucketName).upload(tmpPath, {
      destination: path.join(','),
      metadata: {
        cacheControl: 'no-cache',
      },
    })
  } catch (err) {
    throw err
  } finally {
    deleteTempFile(tmpPath)
  }
}

async function fileExists(path) {
  const [exists] = await storage.bucket(bucketName).file(path.join(',')).exists()
  return exists
}

async function listFiles(path) {
  const [files] = await storage.bucket(bucketName).getFiles({
    prefixes: [path.join(',')],
  })
  return files.map(file => file.name)
}

module.exports = {
  getFile,
  writeFile,
  fileExists,
  listFiles,
  GcsError
}
