const moo = require('moo')

const lexer = moo.compile({
  STRING:  {
    match: new RegExp(/'(?:\\['\\]|[^'])*'/,'u'),
    value: (s) => s.replace(/\\'/ug,'\'').replace(/\\\\/ug,'\\').slice(1,-1)
  },
  CHAR:  {
    match:/"(?:\\.|[^"])"/u,
    value: (s) => s.replace(/\\"/ug,'"').slice(1,-1)
  },
  WS: /[ \t]+/u,
  NUMBER: {
    match: /-?[0-9]+(?:\.?[0-9]+)?/u,
    value: (n) => parseFloat(n)
  },
  BLOB:  {
    match:/<[_a-zA-Z](?:[\p{L}\p{N}]|_)*>/u,
    value: (s) => s.slice(1,-1)
  },
  BOOL: {match: /(?:true)|(?:false)/u, value: (x) => x === 'true'},
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
    match: /[_a-zA-Z](?:[\p{L}\p{N}]|_)*/u,
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
    match: /\$\w+/u,
    value: s => s.slice(1)
  },
  COMPARISON: ['=='  ,  '!=' ,  '>=' ,  '>' ,  '<' ,  '<='],
  STUFF: [':', ',', '<', '>', ';'],
  REF_CALL: '@',
  LOGIC: ['&&' , '||'],
  CLAUSE: /->/u,
  ARITHMETIC: ['+' , /-/u],
  MULTIPLICATIVE: ['*' , '/', '%'],
  ASSIGN: '=',
  NL: { match: /\s*\n\s*/u, lineBreaks: true },
})

module.exports = lexer
