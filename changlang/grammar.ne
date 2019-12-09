@{%
  const helpers = require('./parser_helpers.js')
%}

main -> (function_def):+ {% helpers.flattenAndStrip%}

function_def -> "def" _ identifier _ name_tuple _ "\n" _ block _ "\n" _ "end" "\n":*      {% helpers.makeFunction %}


block ->
    compound                                                                  {% helpers.makeBlock %}
  | compound _ (";"|"\n") _ block                                             {% helpers.makeBlock %}


compound ->
    assignment
  | function_call
  | "return" _ expr                                                           {% helpers.makeReturn %}
  | if                                                                        {% helpers.makeIfStatement %}

if -> "if" __ math _ "\n" _ block _ "\n" _ "end"

assignment ->
    array_deconstruct __ "=" _ expr                                             {% helpers.log %}
  | identifier __ "=" _ expr                                                  {% helpers.makeAssignment%}

expr ->
    math                                                                      {% helpers.strip %}

math ->
    comparison                                                                {% helpers.makeMath %}
comparison ->
    comparison _ ("=="  | "!=" | ">" | "<") _ logic                           {% helpers.makeMath %}
  | logic                                                                     {% helpers.makeMath %}
logic ->
    logic _ ("&&" | "||") _ arithmetic                                        {% helpers.makeMath %}
  | arithmetic                                                                {% helpers.makeMath %}
arithmetic ->
    arithmetic _ ("+" | "-") _ multiplicative                                 {% helpers.makeMath %}
  | multiplicative                                                            {% helpers.makeMath %}
multiplicative ->
    multiplicative _ ("*" | "/") _ thing                                      {% helpers.makeMath %}
  | thing                                                                     {% helpers.makeMath %}

parenthesized -> "(" expr ")"                                                 {% helpers.strip %}

thing ->
    function_call                                                             {% helpers.strip %}
  | number                                                                    {% helpers.strip %}
  | identifier                                                                {% helpers.strip %}
  | parenthesized                                                             {% helpers.strip %}


function_call -> identifier expr_tuple _                                      {% helpers.makeFunctionCall %}

name_tuple ->
    "(" _ ident_list _ ")"                                                    {% helpers.makeTuple %}
  | "(" _ ")"                                                                 {% helpers.makeTuple %}

ident_list ->
    _ident_list                                                               {% helpers.flattenAndStrip %}
  | _ident_list _ ","                                                         {% helpers.flattenAndStrip %}

_ident_list ->
    identifier                                                                {% helpers.flattenAndStrip %}
  | _ident_list _ "," _ identifier                                            {% helpers.flattenAndStrip %}

expr_tuple ->
    "(" _ expr_list _ ")"                                                    {% helpers.makeTuple %}
  | "(" _ ")"                                                                 {% helpers.makeTuple %}

array_create ->
    "[" _ expr_list _ "]"                                                    {% helpers.log %}
  | "[" _ "]"                                                                {% helpers.log %}

array_deconstruct ->
    "[" _ ident_list _ "]"                                                    {% helpers.strip %}
  |  "[" _ identifier _ "|" _ ident_list _ "]"                                                    {% helpers.strip %}
  |  "[" _ ident_list _ "|" _ identifier _ "]"                                                    {% helpers.strip %}
  |  "[" _ ident_list _ "|" _ identifier _ "|" _ ident_list _ "]"                                                    {% helpers.strip %}

expr_list ->
    _expr_list                                                               {% helpers.flattenAndStrip %}
  | _expr_list _ ","                                                         {% helpers.flattenAndStrip %}

_expr_list ->
    expr
  | _expr_list _ "," _ expr                                            {% helpers.flattenAndStrip %}

identifier -> [a-zA-Z_] [\w]:* {% helpers.makeIdentifier %}
number -> [\d]:+ {% helpers.makeNumber %}


_  -> wschar:* {% helpers.skip %}
__ -> wschar:+ {% helpers.skip %}

any_wschar -> [ \t\n\v\f] {% helpers.skip %}
wschar -> [ \t\v\f] {% helpers.skip %}
break -> [\n;]:+ {% helpers.skip %}
