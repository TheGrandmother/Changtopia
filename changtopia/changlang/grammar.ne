@{%
  const ast = require('./ast/ast.js')
  const lexer = require('./tokenizer.js')
  //const ast = {}
%}

@lexer lexer

main -> module (function_def):+ {% ast.flattenAndStrip%}

module -> %module _ identifier %nl                                        {% ast.makeModule %}

function_def ->
  "def" _ identifier _ name_tuple %nl block %nl "end" %nl        {% ast.makeFunction %}

closure -> "def" _ name_tuple (%ws | %nl) block (%ws | %nl) "end"                  {% ast.makeClosure %}

block ->
    compound                                                                  {% ast.makeBlock %}
  | compound _ (";"|%nl|%ws)  block                                             {% ast.makeBlock %}
  | match  %nl   block                                                   {% ast.makeBlock %}
  | match

match -> "match" __ expr _ %nl _ match_clauses              {% ast.makeMatcher %}

match_clauses ->
    match_clause _ match_clauses
  | "end"

match_clause ->
  thing __ "->" (%ws | %nl) block  (%ws | %nl) "end" %nl       {% ast.makeClause %}

compound ->
    assignment
  | function_call
  | "return" _ expr                                                           {% ast.makeReturn %}
  | if                                                                        {% ast.makeIfStatement %}

if -> "if" __ math (%ws | %nl) block (%ws | %nl) "end"

assignment ->
    unpack __ "=" _ expr                                                      {% ast.makeAssignment %}
  | identifier __ "=" _ expr                                                  {% ast.makeAssignment %}

expr ->
    math                                                                      {% ast.makeExpr %}
  | closure

math ->
    logic                                                                     {% ast.makeMath %}
logic ->
    logic _ %logic _ comparison                                               {% ast.makeMath %}
  | comparison                                                                {% ast.makeMath %}
comparison ->
    comparison _ %comparison _ arithmetic                                     {% ast.makeMath %}
  | arithmetic                                                                {% ast.makeMath %}
arithmetic ->
    arithmetic _ %arithmetic _ multiplicative                                 {% ast.makeMath %}
  | multiplicative                                                            {% ast.makeMath %}
multiplicative ->
    multiplicative _ %multiplicative _ thing                                  {% ast.makeMath %}
  | thing                                                                     {% ast.makeMath %}

parenthesized -> "(" _ expr _ ")"                                             {% ast.strip %}


thing ->
    function_call                                                             {% ast.strip %}
  | parenthesized                                                             {% ast.strip %}
  | array_litteral
  | %string                                                                   {% ast.makeString %}
  | identifier
  | constant                                                                  {% ast.makeConstant %}

constant ->
    %number                                                                   {% ast.makeNumber %}
  | %char                                                                     {% ast.makeChar%}
  | %atom                                                                     {% ast.makeAtom %}
  | %bool                                                                     {% ast.makeBool %}


function_call -> explicit_call | refference_call

explicit_call -> (identifier ":"):? identifier expr_tuple                     {% ast.makeFunctionCall %}
refference_call -> "@" identifier expr_tuple                                  {% ast.makeRefferenceCall %}

name_tuple ->
    "(" _ ident_list _ ")"                                                    {% ast.makeTuple %}
  | "(" _ ")"                                                                 {% ast.makeTuple %}

ident_list ->
    _ident_list                                                               {% ast.makeIdentList %}
  | _ident_list _ "," _ %nl:?                                                 {% ast.makeIdentList %}

_ident_list ->
    identifier                                                                {% ast.flattenAndStrip %}
  | _ident_list _ "," (%nl | %ws):? identifier                                {% ast.flattenAndStrip %}

expr_tuple ->
    "(" %nl:? _ expr_list _ %nl:? ")"                                         {% ast.makeTuple %}
  | "(" _ ")"                                                                 {% ast.makeTuple %}

expr_list ->
    _expr_list                                                                {% ast.makeExprList %}
  | _expr_list _ ","                                                          {% ast.makeExprList %}

_expr_list ->
    expr
  | _expr_list _ "," %nl:? _ expr                                             {% ast.flattenAndStrip %}

array_litteral ->
    "[" %nl:? _ repack_list _ %nl:? "]"                                       {% ast.makeArrayLitteral %}
  | "[" _ "]"                                                                 {% ast.makeArrayLitteral %}

repack_list ->
    _repack_list
  | _repack_list _ "," %nl:?

_repack_list ->
    expr
  | array_blob
  | _repack_list _ "," %nl:? _ expr
  | _repack_list _ "," %nl:? _ array_blob

array_blob -> %blob                                          {% ast.makeBlob %}

unpack ->
     "[" %nl:? _ _unpack _ %nl:? "]"                                                      {% ast.makeUnpack %}

_unpack ->
    ident_list                                                                {% ast.strip %}
  | (_ident_list _ "," %nl:?):? _
    array_blob
    _ ("," %nl:? _ident_list {% ast.strip %}):?

identifier ->
  %identifier                                                                 {% ast.makeIdentifier %}

_  -> %ws:* {% ast.skip %}
__ -> %ws:+ {% ast.skip %}
