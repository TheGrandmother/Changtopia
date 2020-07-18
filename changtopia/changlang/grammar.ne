@{%
  const ast = require('./ast/ast.js')
  const lexer = require('./tokenizer.js')
  //const ast = {}
%}

@lexer lexer

main -> module (function_def):+ {% ast.flattenAndStrip%}

module -> %MODULE _ identifier %NL                                        {% ast.makeModule %}

function_def ->
  %DEF _ identifier _ name_tuple %NL block %NL %END %NL        {% ast.makeFunction %}

closure -> %DEF _ name_tuple (%WS | %NL) block (%WS | %NL) %END                  {% ast.makeClosure %}

block ->
    compound                                                                  {% ast.makeBlock %}
  | compound _ (";"|%NL|%WS)  block                                             {% ast.makeBlock %}
  | match  %NL   block                                                   {% ast.makeBlock %}
  | match

match -> %MATCH __ expr _ %NL _ match_clauses              {% ast.makeMatcher %}

match_clauses ->
    match_clause _ match_clauses
  | %END

match_clause ->
  thing __ %CLAUSE (%WS | %NL) block  (%WS | %NL) %END %NL       {% ast.makeClause %}

compound ->
    assignment
  | function_call
  | %RETURN _ expr                                                           {% ast.makeReturn %}
  | if                                                                        {% ast.makeIfStatement %}

if -> %IF __ math (%WS | %NL) block (%WS | %NL) %END

assignment ->
    unpack __ %ASSIGN _ expr                                                      {% ast.makeAssignment %}
  | identifier __ %ASSIGN _ expr                                                  {% ast.makeAssignment %}

expr ->
    math                                                                      {% ast.makeExpr %}
  | closure

math ->
    logic                                                                     {% ast.makeMath %}
logic ->
    logic _ %LOGIC _ comparison                                               {% ast.makeMath %}
  | comparison                                                                {% ast.makeMath %}
comparison ->
    comparison _ %COMPARISON _ arithmetic                                     {% ast.makeMath %}
  | arithmetic                                                                {% ast.makeMath %}
arithmetic ->
    arithmetic _ %ARITHMETIC _ multiplicative                                 {% ast.makeMath %}
  | multiplicative                                                            {% ast.makeMath %}
multiplicative ->
    multiplicative _ %MULTIPLICATIVE _ thing                                  {% ast.makeMath %}
  | thing                                                                     {% ast.makeMath %}

parenthesized -> "(" _ expr _ ")"                                             {% ast.strip %}


thing ->
    function_call                                                             {% ast.strip %}
  | parenthesized                                                             {% ast.strip %}
  | array_litteral
  | identifier
  | %STRING                                                                   {% ast.makeString %}
  | constant                                                                  {% ast.makeConstant %}

constant ->
    %NUMBER                                                                   {% ast.makeNumber %}
  | %CHAR                                                                     {% ast.makeChar%}
  | %ATOM                                                                     {% ast.makeAtom %}
  | %BOOL                                                                     {% ast.makeBool %}


function_call -> explicit_call | refference_call

explicit_call -> (identifier ":"):? identifier expr_tuple                     {% ast.makeFunctionCall %}
refference_call -> "@" identifier expr_tuple                                  {% ast.makeRefferenceCall %}

name_tuple ->
    "(" _ ident_list _ ")"                                                    {% ast.makeTuple %}
  | "(" _ ")"                                                                 {% ast.makeTuple %}

ident_list ->
    _ident_list                                                               {% ast.makeIdentList %}
  | _ident_list _ "," _ %NL:?                                                 {% ast.makeIdentList %}

_ident_list ->
    identifier                                                                {% ast.flattenAndStrip %}
  | _ident_list _ "," (%NL | %WS):? identifier                                {% ast.flattenAndStrip %}

expr_tuple ->
    "(" %NL:? _ expr_list _ %NL:? ")"                                         {% ast.makeTuple %}
  | "(" _ ")"                                                                 {% ast.makeTuple %}

expr_list ->
    _expr_list                                                                {% ast.makeExprList %}
  | _expr_list _ ","                                                          {% ast.makeExprList %}

_expr_list ->
    expr
  | _expr_list _ "," %NL:? _ expr                                             {% ast.flattenAndStrip %}

array_litteral ->
    "[" %NL:? _ repack_list _ %NL:? "]"                                       {% ast.makeArrayLitteral %}
  | "[" _ "]"                                                                 {% ast.makeArrayLitteral %}

repack_list ->
    _repack_list
  | _repack_list _ "," %NL:?

_repack_list ->
    expr
  | array_blob
  | _repack_list _ "," %NL:? _ expr
  | _repack_list _ "," %NL:? _ array_blob

array_blob -> %BLOB                                          {% ast.makeBlob %}

unpack ->
     "[" %NL:? _ _unpack _ %NL:? "]"                                                      {% ast.makeUnpack %}

_unpack ->
    ident_list                                                                {% ast.strip %}
  | (_ident_list _ "," %NL:?):? _
    array_blob
    _ ("," %NL:? _ident_list {% ast.strip %}):?

identifier ->
  %IDENTIFIER                                                                 {% ast.makeIdentifier %}

_  -> %WS:* {% ast.skip %}
__ -> %WS:+ {% ast.skip %}
