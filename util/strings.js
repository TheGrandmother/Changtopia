module.exports.fromJsString = (arr) => arr.split('').map(c => c.charCodeAt(0))
module.exports.toJsString = (arr) => typeof arr === 'string' ? arr : String.fromCharCode(...arr)
