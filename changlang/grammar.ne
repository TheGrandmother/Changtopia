@{%
  const helpers = require('./parser_helpers.js')
%}

main -> (function_def):+ {% helpers.flattenAndStrip%}

function_def -> "def" _ identifier _ name_tuple _ "\n" _ block _ "\n" _ "end" "\n":*      {% helpers.makeFunction %}


block ->
    compound                                                                  {% helpers.makeBlock %}
  | compound _ (";"|"\n") _ block                                             {% helpers.makeBlock %}


compound ->
    assignment                                                                {% helpers.makeAssignment%}
  | function_call
  | spawn                                                                     {% helpers.strip%}
  | "return" _ expr                                                           {% helpers.makeReturn %}
  | if                                                                        {% helpers.makeIfStatement %}
  | await

if -> "if" __ math _ "\n" _ block _ "\n" _ "end"
await -> "await" __ identifier                                                {% helpers.makeAwait %}

assignment -> identifier __ "=" _ expr

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
  | spawn                                                                     {% helpers.strip %}
  | number                                                                    {% helpers.strip %}
  | identifier                                                                {% helpers.strip %}
  | parenthesized                                                             {% helpers.strip %}


function_call -> identifier expr_tuple _                                      {% helpers.makeFunctionCall %}
spawn -> "spawn" __ identifier _ expr_tuple                                   {% helpers.makeSpawn %}

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

list_delimiter -> [,] {% helpers.skip %}
left_paran -> "(" {% helpers.skip %}
right_paran -> ")" {% helpers.skip %}
list_delimiter -> "," {% helpers.skip %}
def -> "def" {% helpers.skip %}
end -> "end" {% helpers.skip %}
nl -> "\n" {% helpers.skip %}
