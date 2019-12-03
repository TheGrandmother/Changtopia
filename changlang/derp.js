// Generated automatically by nearley, version 2.19.0
// http://github.com/Hardmath123/nearley
(function () {
function id(x) { return x[0]; }

  const helpers = require('./parser_helpers.js')
var grammar = {
    Lexer: undefined,
    ParserRules: [
    {"name": "main$ebnf$1$subexpression$1", "symbols": ["function_def"]},
    {"name": "main$ebnf$1$subexpression$1", "symbols": ["any_wschar"]},
    {"name": "main$ebnf$1", "symbols": ["main$ebnf$1$subexpression$1"]},
    {"name": "main$ebnf$1$subexpression$2", "symbols": ["function_def"]},
    {"name": "main$ebnf$1$subexpression$2", "symbols": ["any_wschar"]},
    {"name": "main$ebnf$1", "symbols": ["main$ebnf$1", "main$ebnf$1$subexpression$2"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "main", "symbols": ["main$ebnf$1"], "postprocess": helpers.flattenAndStrip},
    {"name": "function_def$string$1", "symbols": [{"literal":"d"}, {"literal":"e"}, {"literal":"f"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "function_def$subexpression$1$ebnf$1", "symbols": ["identifier"], "postprocess": id},
    {"name": "function_def$subexpression$1$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "function_def$subexpression$1", "symbols": ["function_def$subexpression$1$ebnf$1"]},
    {"name": "function_def$string$2", "symbols": [{"literal":"e"}, {"literal":"n"}, {"literal":"d"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "function_def", "symbols": ["function_def$string$1", "_", "identifier", "_", {"literal":"("}, "_", "function_def$subexpression$1", "_", {"literal":")"}, "_", {"literal":"\n"}, "_", "block", "_", {"literal":"\n"}, "_", "function_def$string$2"], "postprocess": helpers.makeFunction},
    {"name": "block", "symbols": ["compound"], "postprocess": helpers.makeBlock},
    {"name": "block$subexpression$1", "symbols": [{"literal":";"}]},
    {"name": "block$subexpression$1", "symbols": [{"literal":"\n"}]},
    {"name": "block", "symbols": ["compound", "_", "block$subexpression$1", "_", "block"], "postprocess": helpers.makeBlock},
    {"name": "compound", "symbols": ["assignment"], "postprocess": helpers.strip},
    {"name": "compound$string$1", "symbols": [{"literal":"r"}, {"literal":"e"}, {"literal":"t"}, {"literal":"u"}, {"literal":"r"}, {"literal":"n"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "compound", "symbols": ["compound$string$1", "_", "expr"], "postprocess": helpers.makeReturn},
    {"name": "compound", "symbols": ["if"]},
    {"name": "if$string$1", "symbols": [{"literal":"i"}, {"literal":"f"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "if$string$2", "symbols": [{"literal":"e"}, {"literal":"n"}, {"literal":"d"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "if", "symbols": ["if$string$1", "__", "math", "_", {"literal":"\n"}, "_", "block", "_", {"literal":"\n"}, "_", "if$string$2"], "postprocess": helpers.makeIfStatement},
    {"name": "assignment", "symbols": ["identifier", "_", {"literal":"="}, "_", "math"], "postprocess": helpers.makeAssignment},
    {"name": "expr", "symbols": ["math"], "postprocess": helpers.strip},
    {"name": "math", "symbols": ["comparison"], "postprocess": helpers.makeMath},
    {"name": "comparison$subexpression$1$string$1", "symbols": [{"literal":"="}, {"literal":"="}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "comparison$subexpression$1", "symbols": ["comparison$subexpression$1$string$1"]},
    {"name": "comparison$subexpression$1$string$2", "symbols": [{"literal":"!"}, {"literal":"="}, {"literal":"="}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "comparison$subexpression$1", "symbols": ["comparison$subexpression$1$string$2"]},
    {"name": "comparison$subexpression$1", "symbols": [{"literal":">"}]},
    {"name": "comparison$subexpression$1", "symbols": [{"literal":"<"}]},
    {"name": "comparison", "symbols": ["comparison", "_", "comparison$subexpression$1", "_", "logic"], "postprocess": helpers.makeMath},
    {"name": "comparison", "symbols": ["logic"], "postprocess": helpers.makeMath},
    {"name": "logic$subexpression$1$string$1", "symbols": [{"literal":"&"}, {"literal":"&"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "logic$subexpression$1", "symbols": ["logic$subexpression$1$string$1"]},
    {"name": "logic$subexpression$1$string$2", "symbols": [{"literal":"|"}, {"literal":"|"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "logic$subexpression$1", "symbols": ["logic$subexpression$1$string$2"]},
    {"name": "logic", "symbols": ["logic", "_", "logic$subexpression$1", "_", "arithmetic"], "postprocess": helpers.makeMath},
    {"name": "logic", "symbols": ["arithmetic"], "postprocess": helpers.makeMath},
    {"name": "arithmetic$subexpression$1", "symbols": [{"literal":"+"}]},
    {"name": "arithmetic$subexpression$1", "symbols": [{"literal":"-"}]},
    {"name": "arithmetic", "symbols": ["arithmetic", "_", "arithmetic$subexpression$1", "_", "multiplicative"], "postprocess": helpers.makeMath},
    {"name": "arithmetic", "symbols": ["multiplicative"], "postprocess": helpers.makeMath},
    {"name": "multiplicative$subexpression$1", "symbols": [{"literal":"*"}]},
    {"name": "multiplicative$subexpression$1", "symbols": [{"literal":"/"}]},
    {"name": "multiplicative", "symbols": ["multiplicative", "_", "multiplicative$subexpression$1", "_", "thing"], "postprocess": helpers.makeMath},
    {"name": "multiplicative", "symbols": ["thing"], "postprocess": helpers.makeMath},
    {"name": "thing", "symbols": ["number"], "postprocess": helpers.strip},
    {"name": "thing", "symbols": ["identifier"], "postprocess": helpers.strip},
    {"name": "number", "symbols": ["_number"], "postprocess": helpers.makeNumber},
    {"name": "_number", "symbols": [/[1-9]/], "postprocess": id},
    {"name": "_number", "symbols": ["_name", /[\d]/], "postprocess": function(d) {return d[0] + d[1]; }},
    {"name": "identifier$ebnf$1", "symbols": []},
    {"name": "identifier$ebnf$1", "symbols": ["identifier$ebnf$1", /[\w]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "identifier", "symbols": [/[a-zA-Z_]/, "identifier$ebnf$1"], "postprocess": helpers.makeIdentifier},
    {"name": "_name", "symbols": [/[a-zA-Z_]/], "postprocess": id},
    {"name": "_name", "symbols": ["_name", /[\w_]/], "postprocess": function(d) {return d[0] + d[1]; }},
    {"name": "_$ebnf$1", "symbols": []},
    {"name": "_$ebnf$1", "symbols": ["_$ebnf$1", "wschar"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "_", "symbols": ["_$ebnf$1"], "postprocess": function(d) {return null;}},
    {"name": "__$ebnf$1", "symbols": ["wschar"]},
    {"name": "__$ebnf$1", "symbols": ["__$ebnf$1", "wschar"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "__", "symbols": ["__$ebnf$1"], "postprocess": function(d) {return null;}},
    {"name": "any_wschar", "symbols": [/[ \t\n\v\f]/], "postprocess": helpers.skip},
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
