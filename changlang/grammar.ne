@{%
  const ast = require('./ast/ast.js')
  //const ast = {}
%}

main -> module (function_def):+ {% ast.flattenAndStrip%}

module -> "module" _ identifier "\n":*                                        {% ast.makeModule %}

function_def ->
  "def" _ identifier _ name_tuple _ "\n" _ block _ "\n" _ "end" "\n":*        {% ast.makeFunction %}


block ->
    compound                                                                  {% ast.makeBlock %}
  | compound _ (";"|"\n") _ block                                             {% ast.makeBlock %}


compound ->
    assignment
  | function_call
  | "return" _ expr                                                           {% ast.makeReturn %}
  | if                                                                        {% ast.makeIfStatement %}

if -> "if" __ math _ "\n" _ block _ "\n" _ "end"

assignment ->
    unpack __ "=" _ expr                                                      {% ast.makeAssignment %}
  | array_indexed __ "=" _ expr                                               {% ast.makeAssignment %}
  | identifier __ "=" _ expr                                                  {% ast.makeAssignment %}

expr ->
    math                                                                      {% ast.makeExpr %}

math ->
    comparison                                                                {% ast.makeMath %}
comparison ->
    comparison _ ("=="  | "!=" | ">" | "<") _ logic                           {% ast.makeMath %}
  | logic                                                                     {% ast.makeMath %}
logic ->
    logic _ ("&&" | "||") _ arithmetic                                        {% ast.makeMath %}
  | arithmetic                                                                {% ast.makeMath %}
arithmetic ->
    arithmetic _ ("+" | "-") _ multiplicative                                 {% ast.makeMath %}
  | multiplicative                                                            {% ast.makeMath %}
multiplicative ->
    multiplicative _ ("*" | "/") _ thing                                      {% ast.makeMath %}
  | thing                                                                     {% ast.makeMath %}

parenthesized -> "(" _ expr _ ")"                                             {% ast.strip %}


thing ->
    function_call                                                             {% ast.strip %}
  | parenthesized                                                             {% ast.strip %}
  | array_litteral                                                            {% ast.makeArrayLitteral %}
  | array_indexed
  | string
  | identifier
  | constant                                                                  {% ast.makeConstant %}

constant ->
    number
  | char                                                                      {% ast.makeChar%}
  | atom

atom -> "$" identifier                                                        {% ast.makeAtom %}

function_call -> (identifier ":"):? identifier expr_tuple                     {% ast.makeFunctionCall %}

array_indexed -> identifier "#" parenthesized                                 {% ast.makeArrayIndexing %}

name_tuple ->
    "(" _ ident_list _ ")"                                                    {% ast.makeTuple %}
  | "(" _ ")"                                                                 {% ast.makeTuple %}

ident_list ->
    _ident_list                                                               {% ast.makeIdentList %}
  | _ident_list _ ","                                                         {% ast.makeIdentList %}

_ident_list ->
    identifier                                                                {% ast.flattenAndStrip %}
  | _ident_list _ "," _ identifier                                            {% ast.flattenAndStrip %}

expr_tuple ->
    "(" _ expr_list _ ")"                                                     {% ast.makeTuple %}
  | "(" _ ")"                                                                 {% ast.makeTuple %}

array_litteral ->
    "[" _ repack_list _ "]"
  | "[" _ "]"

repack_list ->
    _repack_list
  | _repack_list _ ","

_repack_list ->
    expr
  | array_blob
  | _repack_list _ "," _ expr
  | _repack_list _ "," _ array_blob

_repack ->
    expr_list
  | expr_list _ "," _ array_blob

array_blob -> "<" _ identifier _ ">"                                          {% ast.makeBlob %}

unpack ->
     "[" _ _unpack _ "]"                                                      {% ast.makeUnpack %}

_unpack ->
    ident_list                                                                {% ast.strip %}
  | (_ident_list _ "," {% ast.strip %}):? _
    array_blob
    _ ("," _ _ident_list {% ast.strip %}):?


string ->
    "'" _string "'"                                                           {% ast.makeString %}
_string ->
    null
  | _string _stringchar

_stringchar ->
    [^\\']
  | "\\'" {% () => ["'"] %}

_charcharbinks ->
    "\"" {% () => ["\""] %}
  | ("\\"):? [^\"]

char ->
    "\"\"\""
  | "\"" ("\\"):? [^\"] "\""

bool -> _bool                                                                 {% ast.makeBool %}
_bool ->
    "true"
  | "false"

expr_list ->
    _expr_list                                                                {% ast.makeExprList %}
  | _expr_list _ ","                                                          {% ast.makeExprList %}

_expr_list ->
    expr
  | _expr_list _ "," _ expr                                                   {% ast.flattenAndStrip %}

crazy_identifier -> identifier | array_indexed

identifier ->
  [a-zA-Z_] [\w]:*                                                            {% ast.makeIdentifier %}

number -> [\d]:+ {% ast.makeNumber %}


_  -> wschar:* {% ast.skip %}
__ -> wschar:+ {% ast.skip %}

any_wschar -> [ \t\n\v\f] {% ast.skip %}
wschar -> [ \t\v\f] {% ast.skip %}
break -> [\n;]:+ {% ast.skip %}
