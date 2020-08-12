// Generated automatically by nearley, version 2.19.3
// http://github.com/Hardmath123/nearley
(function () {
function id(x) { return x[0]; }

  const ast = require('./ast/ast.js')
  const lexer = require('./tokenizer.js')
  //const ast = {}
var grammar = {
    Lexer: lexer,
    ParserRules: [
    {"name": "main$ebnf$1$subexpression$1", "symbols": ["function_def"]},
    {"name": "main$ebnf$1", "symbols": ["main$ebnf$1$subexpression$1"]},
    {"name": "main$ebnf$1$subexpression$2", "symbols": ["function_def"]},
    {"name": "main$ebnf$1", "symbols": ["main$ebnf$1", "main$ebnf$1$subexpression$2"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "main", "symbols": ["module", "main$ebnf$1"], "postprocess": ast.flattenAndStrip},
    {"name": "module", "symbols": [(lexer.has("MODULE") ? {type: "MODULE"} : MODULE), "_", "identifier", (lexer.has("NL") ? {type: "NL"} : NL)], "postprocess": ast.makeModule},
    {"name": "function_def", "symbols": [(lexer.has("DEF") ? {type: "DEF"} : DEF), "_", "identifier", "_", "name_tuple", (lexer.has("NL") ? {type: "NL"} : NL), "block", (lexer.has("NL") ? {type: "NL"} : NL), (lexer.has("END") ? {type: "END"} : END), (lexer.has("NL") ? {type: "NL"} : NL)], "postprocess": ast.makeFunction},
    {"name": "closure$subexpression$1", "symbols": [(lexer.has("WS") ? {type: "WS"} : WS)]},
    {"name": "closure$subexpression$1", "symbols": [(lexer.has("NL") ? {type: "NL"} : NL)]},
    {"name": "closure$subexpression$2", "symbols": [(lexer.has("WS") ? {type: "WS"} : WS)]},
    {"name": "closure$subexpression$2", "symbols": [(lexer.has("NL") ? {type: "NL"} : NL)]},
    {"name": "closure", "symbols": [(lexer.has("DEF") ? {type: "DEF"} : DEF), "_", "name_tuple", "closure$subexpression$1", "block", "closure$subexpression$2", (lexer.has("END") ? {type: "END"} : END)], "postprocess": ast.makeClosure},
    {"name": "block", "symbols": ["compound"], "postprocess": ast.makeBlock},
    {"name": "block$subexpression$1", "symbols": [{"literal":";"}]},
    {"name": "block$subexpression$1", "symbols": [(lexer.has("NL") ? {type: "NL"} : NL)]},
    {"name": "block$subexpression$1", "symbols": [(lexer.has("WS") ? {type: "WS"} : WS)]},
    {"name": "block", "symbols": ["compound", "_", "block$subexpression$1", "block"], "postprocess": ast.makeBlock},
    {"name": "block", "symbols": ["match", (lexer.has("NL") ? {type: "NL"} : NL), "block"], "postprocess": ast.makeBlock},
    {"name": "block", "symbols": ["match"]},
    {"name": "match", "symbols": [(lexer.has("MATCH") ? {type: "MATCH"} : MATCH), "__", "expr", "_", (lexer.has("NL") ? {type: "NL"} : NL), "_", "match_clauses"], "postprocess": ast.makeMatcher},
    {"name": "match_clauses", "symbols": ["match_clause", "_", "match_clauses"]},
    {"name": "match_clauses", "symbols": [(lexer.has("END") ? {type: "END"} : END)]},
    {"name": "match_clause$subexpression$1", "symbols": [(lexer.has("WS") ? {type: "WS"} : WS)]},
    {"name": "match_clause$subexpression$1", "symbols": [(lexer.has("NL") ? {type: "NL"} : NL)]},
    {"name": "match_clause$subexpression$2", "symbols": [(lexer.has("WS") ? {type: "WS"} : WS)]},
    {"name": "match_clause$subexpression$2", "symbols": [(lexer.has("NL") ? {type: "NL"} : NL)]},
    {"name": "match_clause", "symbols": ["thing", "__", (lexer.has("CLAUSE") ? {type: "CLAUSE"} : CLAUSE), "match_clause$subexpression$1", "block", "match_clause$subexpression$2", (lexer.has("END") ? {type: "END"} : END), (lexer.has("NL") ? {type: "NL"} : NL)], "postprocess": ast.makeClause},
    {"name": "compound", "symbols": ["assignment"]},
    {"name": "compound", "symbols": ["function_call"]},
    {"name": "compound", "symbols": [(lexer.has("RETURN") ? {type: "RETURN"} : RETURN), "_", "expr"], "postprocess": ast.makeReturn},
    {"name": "compound", "symbols": ["if"], "postprocess": ast.makeIfStatement},
    {"name": "if$subexpression$1", "symbols": [(lexer.has("WS") ? {type: "WS"} : WS)]},
    {"name": "if$subexpression$1", "symbols": [(lexer.has("NL") ? {type: "NL"} : NL)]},
    {"name": "if$subexpression$2", "symbols": [(lexer.has("WS") ? {type: "WS"} : WS)]},
    {"name": "if$subexpression$2", "symbols": [(lexer.has("NL") ? {type: "NL"} : NL)]},
    {"name": "if", "symbols": [(lexer.has("IF") ? {type: "IF"} : IF), "__", "math", "if$subexpression$1", "block", "if$subexpression$2", (lexer.has("END") ? {type: "END"} : END)]},
    {"name": "assignment", "symbols": ["unpack", "__", (lexer.has("ASSIGN") ? {type: "ASSIGN"} : ASSIGN), "_", "expr"], "postprocess": ast.makeAssignment},
    {"name": "assignment", "symbols": ["identifier", "__", (lexer.has("ASSIGN") ? {type: "ASSIGN"} : ASSIGN), "_", "expr"], "postprocess": ast.makeAssignment},
    {"name": "expr", "symbols": ["math"], "postprocess": ast.makeExpr},
    {"name": "expr", "symbols": ["closure"]},
    {"name": "math", "symbols": ["logic"], "postprocess": ast.makeMath},
    {"name": "logic", "symbols": ["logic", "_", (lexer.has("LOGIC") ? {type: "LOGIC"} : LOGIC), "_", "comparison"], "postprocess": ast.makeMath},
    {"name": "logic", "symbols": ["comparison"], "postprocess": ast.makeMath},
    {"name": "comparison", "symbols": ["comparison", "_", (lexer.has("COMPARISON") ? {type: "COMPARISON"} : COMPARISON), "_", "arithmetic"], "postprocess": ast.makeMath},
    {"name": "comparison", "symbols": ["arithmetic"], "postprocess": ast.makeMath},
    {"name": "arithmetic", "symbols": ["arithmetic", "_", (lexer.has("ARITHMETIC") ? {type: "ARITHMETIC"} : ARITHMETIC), "_", "multiplicative"], "postprocess": ast.makeMath},
    {"name": "arithmetic", "symbols": ["multiplicative"], "postprocess": ast.makeMath},
    {"name": "multiplicative", "symbols": ["multiplicative", "_", (lexer.has("MULTIPLICATIVE") ? {type: "MULTIPLICATIVE"} : MULTIPLICATIVE), "_", "thing"], "postprocess": ast.makeMath},
    {"name": "multiplicative", "symbols": ["thing"], "postprocess": ast.makeMath},
    {"name": "parenthesized", "symbols": [{"literal":"("}, "_", "expr", "_", {"literal":")"}], "postprocess": ast.strip},
    {"name": "thing", "symbols": ["function_call"], "postprocess": ast.strip},
    {"name": "thing", "symbols": ["parenthesized"], "postprocess": ast.strip},
    {"name": "thing", "symbols": ["array_litteral"]},
    {"name": "thing", "symbols": ["identifier"]},
    {"name": "thing", "symbols": [(lexer.has("STRING") ? {type: "STRING"} : STRING)], "postprocess": ast.makeString},
    {"name": "thing", "symbols": ["constant"], "postprocess": ast.makeConstant},
    {"name": "constant", "symbols": [(lexer.has("NUMBER") ? {type: "NUMBER"} : NUMBER)], "postprocess": ast.makeNumber},
    {"name": "constant", "symbols": [(lexer.has("CHAR") ? {type: "CHAR"} : CHAR)], "postprocess": ast.makeChar},
    {"name": "constant", "symbols": [(lexer.has("ATOM") ? {type: "ATOM"} : ATOM)], "postprocess": ast.makeAtom},
    {"name": "constant", "symbols": [(lexer.has("BOOL") ? {type: "BOOL"} : BOOL)], "postprocess": ast.makeBool},
    {"name": "function_call", "symbols": ["explicit_call"]},
    {"name": "function_call", "symbols": ["refference_call"]},
    {"name": "explicit_call$ebnf$1$subexpression$1", "symbols": ["identifier", {"literal":":"}]},
    {"name": "explicit_call$ebnf$1", "symbols": ["explicit_call$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "explicit_call$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "explicit_call", "symbols": ["explicit_call$ebnf$1", "identifier", "expr_tuple"], "postprocess": ast.makeFunctionCall},
    {"name": "refference_call", "symbols": [(lexer.has("REF_CALL") ? {type: "REF_CALL"} : REF_CALL), "identifier", "expr_tuple"], "postprocess": ast.makeRefferenceCall},
    {"name": "name_tuple", "symbols": [{"literal":"("}, "_", "ident_list", "_", {"literal":")"}], "postprocess": ast.makeTuple},
    {"name": "name_tuple", "symbols": [{"literal":"("}, "_", {"literal":")"}], "postprocess": ast.makeTuple},
    {"name": "ident_list", "symbols": ["_ident_list"], "postprocess": ast.makeIdentList},
    {"name": "ident_list$ebnf$1", "symbols": [(lexer.has("NL") ? {type: "NL"} : NL)], "postprocess": id},
    {"name": "ident_list$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "ident_list", "symbols": ["_ident_list", "_", {"literal":","}, "_", "ident_list$ebnf$1"], "postprocess": ast.makeIdentList},
    {"name": "_ident_list", "symbols": ["identifier"], "postprocess": ast.flattenAndStrip},
    {"name": "_ident_list$ebnf$1$subexpression$1", "symbols": [(lexer.has("NL") ? {type: "NL"} : NL)]},
    {"name": "_ident_list$ebnf$1$subexpression$1", "symbols": [(lexer.has("WS") ? {type: "WS"} : WS)]},
    {"name": "_ident_list$ebnf$1", "symbols": ["_ident_list$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "_ident_list$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "_ident_list", "symbols": ["_ident_list", "_", {"literal":","}, "_ident_list$ebnf$1", "identifier"], "postprocess": ast.flattenAndStrip},
    {"name": "expr_tuple$ebnf$1", "symbols": [(lexer.has("NL") ? {type: "NL"} : NL)], "postprocess": id},
    {"name": "expr_tuple$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "expr_tuple$ebnf$2", "symbols": [(lexer.has("NL") ? {type: "NL"} : NL)], "postprocess": id},
    {"name": "expr_tuple$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "expr_tuple", "symbols": [{"literal":"("}, "expr_tuple$ebnf$1", "_", "expr_list", "_", "expr_tuple$ebnf$2", {"literal":")"}], "postprocess": ast.makeTuple},
    {"name": "expr_tuple", "symbols": [{"literal":"("}, "_", {"literal":")"}], "postprocess": ast.makeTuple},
    {"name": "expr_list", "symbols": ["_expr_list"], "postprocess": ast.makeExprList},
    {"name": "expr_list", "symbols": ["_expr_list", "_", {"literal":","}], "postprocess": ast.makeExprList},
    {"name": "_expr_list", "symbols": ["expr"]},
    {"name": "_expr_list$ebnf$1", "symbols": [(lexer.has("NL") ? {type: "NL"} : NL)], "postprocess": id},
    {"name": "_expr_list$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "_expr_list", "symbols": ["_expr_list", "_", {"literal":","}, "_expr_list$ebnf$1", "_", "expr"], "postprocess": ast.flattenAndStrip},
    {"name": "array_litteral$ebnf$1", "symbols": [(lexer.has("NL") ? {type: "NL"} : NL)], "postprocess": id},
    {"name": "array_litteral$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "array_litteral$ebnf$2", "symbols": [(lexer.has("NL") ? {type: "NL"} : NL)], "postprocess": id},
    {"name": "array_litteral$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "array_litteral", "symbols": [{"literal":"["}, "array_litteral$ebnf$1", "_", "repack_list", "_", "array_litteral$ebnf$2", {"literal":"]"}], "postprocess": ast.makeArrayLitteral},
    {"name": "array_litteral", "symbols": [{"literal":"["}, "_", {"literal":"]"}], "postprocess": ast.makeArrayLitteral},
    {"name": "repack_list", "symbols": ["_repack_list"]},
    {"name": "repack_list", "symbols": ["_repack_list", "_", {"literal":","}]},
    {"name": "_repack_list", "symbols": ["expr"]},
    {"name": "_repack_list", "symbols": ["array_blob"]},
    {"name": "_repack_list$ebnf$1", "symbols": [(lexer.has("NL") ? {type: "NL"} : NL)], "postprocess": id},
    {"name": "_repack_list$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "_repack_list", "symbols": ["_repack_list", "_", {"literal":","}, "_", "_repack_list$ebnf$1", "expr"]},
    {"name": "_repack_list$ebnf$2", "symbols": [(lexer.has("NL") ? {type: "NL"} : NL)], "postprocess": id},
    {"name": "_repack_list$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "_repack_list", "symbols": ["_repack_list", "_", {"literal":","}, "_", "_repack_list$ebnf$2", "array_blob"]},
    {"name": "array_blob", "symbols": [(lexer.has("BLOB") ? {type: "BLOB"} : BLOB)], "postprocess": ast.makeBlob},
    {"name": "unpack$ebnf$1", "symbols": [(lexer.has("NL") ? {type: "NL"} : NL)], "postprocess": id},
    {"name": "unpack$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "unpack$ebnf$2", "symbols": [(lexer.has("NL") ? {type: "NL"} : NL)], "postprocess": id},
    {"name": "unpack$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "unpack", "symbols": [{"literal":"["}, "unpack$ebnf$1", "_", "_unpack", "_", "unpack$ebnf$2", {"literal":"]"}], "postprocess": ast.makeUnpack},
    {"name": "_unpack", "symbols": ["ident_list"], "postprocess": ast.strip},
    {"name": "_unpack$ebnf$1$subexpression$1$ebnf$1", "symbols": [(lexer.has("NL") ? {type: "NL"} : NL)], "postprocess": id},
    {"name": "_unpack$ebnf$1$subexpression$1$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "_unpack$ebnf$1$subexpression$1", "symbols": ["_ident_list", "_", {"literal":","}, "_unpack$ebnf$1$subexpression$1$ebnf$1"]},
    {"name": "_unpack$ebnf$1", "symbols": ["_unpack$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "_unpack$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "_unpack$ebnf$2$subexpression$1$ebnf$1", "symbols": [(lexer.has("NL") ? {type: "NL"} : NL)], "postprocess": id},
    {"name": "_unpack$ebnf$2$subexpression$1$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "_unpack$ebnf$2$subexpression$1", "symbols": [{"literal":","}, "_unpack$ebnf$2$subexpression$1$ebnf$1", "_ident_list"], "postprocess": ast.strip},
    {"name": "_unpack$ebnf$2", "symbols": ["_unpack$ebnf$2$subexpression$1"], "postprocess": id},
    {"name": "_unpack$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "_unpack", "symbols": ["_unpack$ebnf$1", "_", "array_blob", "_", "_unpack$ebnf$2"]},
    {"name": "identifier", "symbols": [(lexer.has("IDENTIFIER") ? {type: "IDENTIFIER"} : IDENTIFIER)], "postprocess": ast.makeIdentifier},
    {"name": "_$ebnf$1", "symbols": []},
    {"name": "_$ebnf$1", "symbols": ["_$ebnf$1", (lexer.has("WS") ? {type: "WS"} : WS)], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "_", "symbols": ["_$ebnf$1"], "postprocess": ast.skip},
    {"name": "__$ebnf$1", "symbols": [(lexer.has("WS") ? {type: "WS"} : WS)]},
    {"name": "__$ebnf$1", "symbols": ["__$ebnf$1", (lexer.has("WS") ? {type: "WS"} : WS)], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "__", "symbols": ["__$ebnf$1"], "postprocess": ast.skip}
]
  , ParserStart: "main"
}
if (typeof module !== 'undefined'&& typeof module.exports !== 'undefined') {
   module.exports = grammar;
} else {
   window.grammar = grammar;
}
})();
