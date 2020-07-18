const moo = require('moo')

const lexer = moo.compile({
  STRING:  {
    match:/'(?:\\['\\]|[^'])*'/,
    value: (s) => s.replace(/\\'/g,'\'').replace(/\\\\/g,'\\').slice(1,-1)
  },
  CHAR:  {
    match:/"(?:\\.|[^"])"/,
    value: (s) => s.replace(/\\"/g,'"').slice(1,-1)
  },
  WS: /[ \t]+/,
  NUMBER: {
    match: /-?[0-9]+(?:\.?[0-9]+)?/,
    value: (n) => parseFloat(n)
  },
  BLOB:  {
    match:/<[_a-zA-Z]+\w*>/,
    value: (s) => s.slice(1,-1)
  },
  BOOL: {match: /(?:true)|(?:false)/, value: (x) => x === 'true'},
  BRACKET: {
    match: [
      '(',
      ')',
      '{',
      '}',
      '[',
      ']',
    ]
  },
  IDENTIFIER: {
    match: /[_a-zA-Z]+\w*/,
    type: moo.keywords({
      DEF: 'def',
      MODULE: 'module',
      END: 'end',
      MATCH: 'match',
      IF: 'if',
      RETURN: 'return',
    })
  },
  ATOM: {
    match: /\$[_a-zA-Z0-9]+/,
    value: s => s.slice(1)
  },
  COMPARISON: ['=='  ,  '!=' ,  '>=' ,  '>' ,  '<' ,  '<='],
  STUFF: [':', ',', '<', '>', '@', ';'],
  LOGIC: ['&&' , '||'],
  CLAUSE: '->',
  ARITHMETIC: ['+' , '-'],
  MULTIPLICATIVE: ['*' , '/', '%'],
  ASSIGN: '=',
  NL: { match: /\s*\n\s*/, lineBreaks: true },
})

module.exports = lexer
