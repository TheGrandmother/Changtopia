@{%
  const helpers = require('./parser_helpers.js')
%}

main -> (function_def | any_wschar):+ {% helpers.flattenAndStrip %}

function_def -> "def" _ identifier _ "(" _ (identifier:?) _ ")" _ "\n" _ block _ "\n" _ "end" {% helpers.makeFunction %}


block ->
    compound {% helpers.makeBlock %}
  | compound _ (";"|"\n") _ block {% helpers.makeBlock %}


compound ->
    assignment {% helpers.strip %}
  | "return" _ expr {% helpers.makeReturn %}
  | if


if -> "if" __ math _ "\n" _ block _ "\n" _ "end" {% helpers.makeIfStatement %}

assignment -> identifier _ "=" _ expr {% helpers.makeAssignment%}


expr -> math {%helpers.strip%}

math -> comparison {% helpers.makeMath %}
comparison ->
    comparison _ ("=="  | "!==" | ">" | "<") _ logic {% helpers.makeMath %}
  | logic {% helpers.makeMath %}
logic ->
    logic _ ("&&" | "||") _ arithmetic {% helpers.makeMath %}
  | arithmetic {% helpers.makeMath %}
arithmetic ->
    arithmetic _ ("+" | "-") _ multiplicative {% helpers.makeMath %}
  | multiplicative {% helpers.makeMath %}
multiplicative ->
    multiplicative _ ("*" | "/") _ thing {% helpers.makeMath %}
  | thing {% helpers.makeMath %}

thing ->
    number {% helpers.strip %}
  | identifier {% helpers.strip %}


identifier -> [a-zA-Z_] [\w]:* {% helpers.makeIdentifier %}
number -> [\d]:+ {% helpers.makeNumber %}


_  -> wschar:* {% function(d) {return null;} %}
__ -> wschar:+ {% function(d) {return null;} %}

any_wschar -> [ \t\n\v\f] {% helpers.skip %}
wschar -> [ \t\v\f] {% id %}
break -> [\n;]:+ {% function(d) {return null;} %}
