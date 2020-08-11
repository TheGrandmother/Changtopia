if version < 600
  syntax clear
elseif exists("b:current_syntax") && b:current_syntax != "chang"
  finish
endif

" reset syntax highlighting for the current buffer.
syntax clear
" chang is case sensitive.
syntax case match

syntax keyword changBlocks def if end match
syntax keyword changReturn return module
syntax keyword changBoolean true false
"syntax keyword changModifier passive require
"syntax keyword changModule module import qualified hiding as
"syntax keyword changConditional if then else match case unless
"syntax keyword changRepeat repeat <- while break for by in let var val
"syntax keyword changKeyword matches with when => new print println do end return For Foreach
"syntax keyword changType string uint int char bool unit real
"syntax keyword changBlocking get fut
"syntax keyword changEmbed embed body
"syntax keyword changOperator and not or

syntax region changString start=/"/ skip=/\\"/ end=/"/
syntax region changChar start=/'/ skip=/\\'/ end=/'/

syntax match changComment "--.*\|//.*"
" syntax match changTypeThing ":\s\*\w\+"
" syntax region changComment start="{-" end="-}"
" syntax region changComment start="/\*" end="\*/"
" syntax region changParam start="<\s*\w+" end=">"
" syntax region changEmbed start="embed" end="end"

syntax match changNumber "\d\+"
syntax match changIdentifier /\w\+/
syntax match changAtom /$\w\+/
syntax match changModuleName /\zs\w\+\ze\:/
syntax match changFunction /\zs\w\+\ze(/

highlight link changBlocks Identifier
highlight link changReturn Keyword
highlight link changIdentifier Normal
highlight link changBoolean Boolean
highlight link changAtom Boolean
highlight link changNumber Number
highlight link changString String
highlight link changChar String
highlight link changModuleName Type
highlight link changFunction PreProc

" highlight link changTrait Statement
" highlight link changModule StorageClass
" highlight link changTypeDef Typedef
" highlight link changConditional Conditional
" highlight link changRepeat Repeat
" highlight link changKeyword Keyword
" highlight link changType Label
" highlight link changTypeThing Label
" highlight link changParam Label
highlight link changComment Comment
" highlight link changString String
" highlight link changChar String
" highlight link changNumber Number
" highlight link changOperator Operator
" highlight link changStatement Statement
" highlight link changBoolean Boolean
" highlight link changModifier Typedef
" highlight link changMaybe Boolean
" highlight link changEmbed PreCondit

syn region changFoldMatch
      \ start="def"
      \ end="end"
      \ transparent fold
      \ keepend extend
