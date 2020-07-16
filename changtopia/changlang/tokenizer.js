const moo = require('moo')

const lexer = moo.compile({
  string:  {
    match:/'(?:\\['\\]|[^'])*'/,
    value: (s) => s.replace(/\\'/g,'\'').replace(/\\\\/g,'\\').slice(1,-1)
  },
  char:  {
    match:/"(?:\\.|[^"])"/,
    value: (s) => s.replace(/\\"/g,'"').slice(1,-1)
  },
  ws: /[ \t]+/,
  number: {
    match: /-?[0-9]+(?:\.?[0-9]+)?/,
    value: (n) => parseFloat(n)
  },
  blob:  {
    match:/<[_a-zA-Z]+\w*>/,
    value: (s) => s.slice(1,-1)
  },
  bool: {match: /(?:true)|(?:false)/, value: (x) => x === 'true'},
  bracket: {
    match: [
      '(',
      ')',
      '{',
      '}',
      '[',
      ']',
    ]
  },
  identifier: {
    match: /[_a-zA-Z]+\w*/,
    type: moo.keywords({
      def: 'def',
      module: 'module',
      end: 'end',
      match: 'match',
      if: 'if',
      return: 'return',
    })
  },
  atom: {
    match: /\$[_a-zA-Z0-9]+/,
    value: s => s.slice(1)
  },
  comparison: ['=='  ,  '!=' ,  '>=' ,  '>' ,  '<' ,  '<='],
  stuff: [':', ',', '<', '>', '@', ';', '->'],
  logic: ['&&' , '||'],
  arithmetic: ['+' , '-'],
  multiplicative: ['*' , '/', '%'],
  assign: '=',
  nl: { match: /\s*\n\s*/, lineBreaks: true },
})

module.exports = lexer
