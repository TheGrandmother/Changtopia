const config = require('../../config.json')

class AccessError extends Error {}
class FileNotFoundError extends Error {}
class BadPathError extends Error {}

let FileHandler
if (config.gds_stuff) {
  throw new Error('This ain\'t a thing yet')
} else {
  FileHandler = require('./localHandler.js')
}

function checkAndTrimPath(path, allowEmpty = false) {
  console.log('dsafsdfasdfasdfasd', path)
  if ((path.length === 0 || (path.length === 1 && path[0] === '')) && allowEmpty) {
    return []
  }
  if (path.some(p => typeof p !== 'string')) {
    throw new BadPathError('Some elements of the path is not a string')
  }
  const trimed = path.map(p => p.trim())
  if (trimed.some(p => p === '' || p.match(/.*(\s|,).*/))) {
    throw new BadPathError('The path contains bad characters or empty elements')
  }

  return trimed
}

async function storeFile(path, user, content, options = {}, override = false) {
  path = checkAndTrimPath(path)
  if (path.length === 0) {
    throw new AccessError('The path is empty')
  }
  if (path.length === 1 && !override) {
    throw new AccessError('Don\'t fuck about with root level stuff')
  }
  if (await FileHandler.fileExists(path)) {
    const header = JSON.parse((await FileHandler.getFile(path)).split('\n')[0])
    if (header.protected && header.owner !== user && !override) {
      throw new AccessError('You are not allowed to edit this file')
    } else {
      return await FileHandler.writeFile(path, [JSON.stringify({...header, ...options}), content].join('\n'))
    }
  }
  return await FileHandler.writeFile(path, [JSON.stringify({...options, owner: user}), content].join('\n'))
}

async function getFile(path) {
  path = checkAndTrimPath(path, true)
  const fileExists = await FileHandler.fileExists(path)
  if (fileExists) {
    const [_, ...content] =  (await FileHandler.getFile(path)).split('\n')
    return content.join('\n')
  } else {
    throw new FileNotFoundError(`There is no file with path ${path.join(',')}`)
  }
}

async function listFiles(path) {
  path = checkAndTrimPath(path, true)
  const result =  await FileHandler.listFiles(path)
  console.log(result)
  return result
}

module.exports = {
  storeFile,
  getFile,
  listFiles,
  AccessError,
  FileNotFoundError
}
