const ignoreUs = [
  ',', ';', '(', ')',
  '\n', 'def',
  'end', 'if',
  '[', ']', '|',
  '->', '!', null,
  '#', '<', '>',
  '$', '\'', '"',
  'module', ':', '@']

function strip (arr, preserveArray = false) {
  if (!Array.isArray(arr)) {
    return arr
  }
  if (arr.length === 1 && Array.isArray(arr[0])) {
    return strip(arr[0])
  } else {
    const stripped =  arr.filter(e => !ignoreUs.includes(e))
    if (stripped.length === 1 && !preserveArray) {
      return stripped[0]
    } else {
      return stripped
    }
  }
}

function deepStrip(arr) {
  return arr.filter(e => !ignoreUs.includes(e)).map(subArray => {
    if (Array.isArray(subArray)) {
      const stripped =  subArray.filter(e => !ignoreUs.includes(e))
      return deepStrip(stripped)
    } else {
      return strip(subArray)
    }
  })
}

function flattenAndStrip (arr) {
  return strip(arr.flat(Infinity))
}

function dropArray(d) {
  if (Array.isArray(d)) {
    return d[0]
  } else {
    return d
  }
}

function wrapInArray(d) {
  if (d === undefined){
    return []
  } else if (!Array.isArray(d)) {
    return [d]
  } else {
    return d
  }
}

function stripAndLog(d) {
  d = strip(d)
  console.log(d)
  return d
}


function skip() { return null }

function log(d) {
  console._log(d)
  return d
}

function annotateLog(mess) {
  return (d) =>{
    console._log(mess, d)
    return d
  }
}


module.exports = {
  strip,
  skip,
  flattenAndStrip,
  stripAndLog,
  dropArray,
  log,
  annotateLog,
  wrapInArray,
  deepStrip
}
