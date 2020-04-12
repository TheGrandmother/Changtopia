module.exports.fromJsString = (arr) => arr.map(c => c.charCodeAt(0))
module.exports.toJsString = (arr) => String.fromCharCode(...arr)
