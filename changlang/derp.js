// Generated automatically by nearley, version 2.19.0
// http://github.com/Hardmath123/nearley
(function () {
function id(x) { return x[0]; }

  const helpers = require('./parser_helpers.js')
var grammar = {
    Lexer: undefined,
    ParserRules: [
    {"name": "main", "symbols": ["function_def"]},
    {"name": "main", "symbols": ["block"]},
    {"name": "block", "symbols": ["assignment"]},
    {"name": "block", "symbols": ["expr"]},
    {"name": "if_block$string$1", "symbols": [{"literal":"i"}, {"literal":"f"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "if_block$ebnf$1$subexpression$1$string$1", "symbols": [{"literal":"e"}, {"literal":"l"}, {"literal":"s"}, {"literal":"e"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "if_block$ebnf$1$subexpression$1", "symbols": ["break", "if_block$ebnf$1$subexpression$1$string$1", "expr"]},
    {"name": "if_block$ebnf$1", "symbols": ["if_block$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "if_block$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "if_block$string$2", "symbols": [{"literal":"e"}, {"literal":"n"}, {"literal":"d"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "if_block", "symbols": ["if_block$string$1", "_", {"literal":"("}, "expr", {"literal":")"}, "break", "expr", "if_block$ebnf$1", "break", "if_block$string$2"]},
    {"name": "assignment", "symbols": ["identifier", "_", {"literal":"="}, "_", "expr"], "postprocess": helpers.makeAssignment},
    {"name": "expr", "symbols": ["binary_operation"]},
    {"name": "expr", "symbols": ["identifier"]},
    {"name": "expr", "symbols": ["number"]},
    {"name": "expr", "symbols": ["expr", "_", "break", "_", "expr"], "postprocess": helpers.strip},
    {"name": "binary_operation", "symbols": ["comparison"], "postprocess": helpers.log},
    {"name": "comparison$subexpression$1$string$1", "symbols": [{"literal":"="}, {"literal":"="}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "comparison$subexpression$1", "symbols": ["comparison$subexpression$1$string$1"]},
    {"name": "comparison$subexpression$1$string$2", "symbols": [{"literal":"!"}, {"literal":"="}, {"literal":"="}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "comparison$subexpression$1", "symbols": ["comparison$subexpression$1$string$2"]},
    {"name": "comparison$subexpression$1", "symbols": [{"literal":">"}]},
    {"name": "comparison$subexpression$1", "symbols": [{"literal":"<"}]},
    {"name": "comparison", "symbols": ["logic", "_", "comparison$subexpression$1", "_", "logic"], "postprocess": helpers.strip},
    {"name": "logic$subexpression$1$string$1", "symbols": [{"literal":"&"}, {"literal":"&"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "logic$subexpression$1", "symbols": ["logic$subexpression$1$string$1"]},
    {"name": "logic$subexpression$1$string$2", "symbols": [{"literal":"|"}, {"literal":"|"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "logic$subexpression$1", "symbols": ["logic$subexpression$1$string$2"]},
    {"name": "logic", "symbols": ["arithmetic", "_", "logic$subexpression$1", "_", "arithmetic"], "postprocess": helpers.strip},
    {"name": "arithmetic$subexpression$1", "symbols": [{"literal":"+"}]},
    {"name": "arithmetic$subexpression$1", "symbols": [{"literal":"-"}]},
    {"name": "arithmetic", "symbols": ["multiplicative", "_", "arithmetic$subexpression$1", "_", "multiplicative"], "postprocess": helpers.strip},
    {"name": "multiplicative$subexpression$1", "symbols": [{"literal":"*"}]},
    {"name": "multiplicative$subexpression$1", "symbols": [{"literal":"/"}]},
    {"name": "multiplicative", "symbols": ["expr", "_", "multiplicative$subexpression$1", "_", "expr"]},
    {"name": "multiplicative", "symbols": ["expr"], "postprocess": helpers.strip},
    {"name": "number", "symbols": ["_number"], "postprocess": function (d) {return {type: 'number', value: parseInt(d)}}},
    {"name": "_number", "symbols": [/[1-9]/], "postprocess": id},
    {"name": "_number", "symbols": ["_name", /[\d]/], "postprocess": function(d) {return d[0] + d[1]; }},
    {"name": "identifier", "symbols": ["_name"], "postprocess": helpers.makeIdentifier},
    {"name": "_name", "symbols": [/[a-zA-Z_]/], "postprocess": id},
    {"name": "_name", "symbols": ["_name", /[\w_]/], "postprocess": function(d) {return d[0] + d[1]; }},
    {"name": "_$ebnf$1", "symbols": []},
    {"name": "_$ebnf$1", "symbols": ["_$ebnf$1", "wschar"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "_", "symbols": ["_$ebnf$1"], "postprocess": function(d) {return null;}},
    {"name": "__$ebnf$1", "symbols": ["wschar"]},
    {"name": "__$ebnf$1", "symbols": ["__$ebnf$1", "wschar"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "__", "symbols": ["__$ebnf$1"], "postprocess": function(d) {return null;}},
    {"name": "any_wschar", "symbols": [/[ \t\n\v\f]/], "postprocess": id},
    {"name": "wschar", "symbols": [/[ \t\v\f]/], "postprocess": id},
    {"name": "break$ebnf$1", "symbols": [/[\n;]/]},
    {"name": "break$ebnf$1", "symbols": ["break$ebnf$1", /[\n;]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "break", "symbols": ["break$ebnf$1"], "postprocess": function(d) {return null;}}
]
  , ParserStart: "main"
}
if (typeof module !== 'undefined'&& typeof module.exports !== 'undefined') {
   module.exports = grammar;
} else {
   window.grammar = grammar;
}
})();
