if exists('g:loaded_syntastic_chang_checker')
    finish
endif
let g:loaded_syntastic_chang_checker = 1
if !exists('g:syntastic_chang_sort')
    let g:syntastic_chang_sort = 1
endif

let s:save_cpo = &cpo
set cpo&vim

function! SyntaxCheckers_chang_chang_IsAvailable() dict
"    Decho "self.getExec() => " . self.getExec()
    return executable(self.getExec())
endfunction

"function! SyntaxCheckers_chang_chang_GetHighlightRegex(item)
    "if match(a:item['text'], 'assigned but unused variable') > -1
        "let term = split(a:item['text'], ' - ')[1]
        "return '\V\\<'.term.'\\>'
    "endif

    "return ''
"endfunction

function! SyntaxCheckers_chang_chang_GetLocList() dict
    let makeprg = self.makeprgBuild({'args' : ''})
    "let errorformat = '\ %#%f(line %l\\\,column %c):\ %m'
    "let errorformat = '%-IImporting module %m,'
    "let errorformat .= '%-I *** Error during typechecking ***,'
    "let errorformat .= '%E"%f" (line %l\, column %c):,%m'
    let errorformat = '%m at line %l col %c'
    let env = {}
    return SyntasticMake({ 'makeprg': makeprg, 'errorformat': errorformat, 'env': env })
endfunction

call g:SyntasticRegistry.CreateAndRegisterChecker({
            \ 'filetype': 'chang',
            \ 'name': 'chang',
            \ 'exec': 'node' })

let &cpo = s:save_cpo
unlet s:save_cpo

" vim: set sw=4 sts=4 et fdm=marker:
