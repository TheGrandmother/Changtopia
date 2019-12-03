@{%
  const helpers = require('./parser_helpers.js')
%}

main ->
    function_def
  | block

block ->
   assignment
  | expr

  #function_def -> "def" __ function_def_body {% d => {console.log('logging def:', d); return d}%}
  #function_def_body -> function_def_name _ "(" _ function_def_arg _ ")" _ break block break _ "end"
  #function_def_name -> identifier
  #function_def_arg -> identifier | identifier function_def_args
  #function_def_args -> __ funtion_def_args | funtion_def_args:*
#identifier _ "(" _ (identifier _):+ _ ")" _ break _ block _ break _ "end" {% helpers.log %}


if_block -> "if" _ "(" expr ")" break expr ( break "else" expr):? break "end"

assignment -> identifier _ "=" _ expr {% helpers.makeAssignment %}
expr ->
    binary_operation
  | identifier
  | number
  | expr _ break _ expr {%helpers.strip%}

binary_operation -> comparison {% helpers.log %}
comparison ->  logic _ ("=="  | "!==" | ">" | "<") _ logic {% helpers.strip %}
logic ->  arithmetic _ ("&&" | "||") _ arithmetic {% helpers.strip %}
arithmetic ->  multiplicative _ ("+" | "-") _ multiplicative {% helpers.strip %}
multiplicative ->  expr _ ("*" | "/") _ expr | expr {% helpers.strip %}



number -> _number {% function (d) {return {type: 'number', value: parseInt(d)}}%}
_number ->
  [1-9] {% id %}
  | _name [\d] {% function(d) {return d[0] + d[1]; } %}

identifier -> _name {% helpers.makeIdentifier %}
_name ->
  [a-zA-Z_] {% id %}
  | _name [\w_] {% function(d) {return d[0] + d[1]; } %}

_  -> wschar:* {% function(d) {return null;} %}
__ -> wschar:+ {% function(d) {return null;} %}

any_wschar -> [ \t\n\v\f] {% id %}
wschar -> [ \t\v\f] {% id %}
break -> [\n;]:+ {% function(d) {return null;} %}
