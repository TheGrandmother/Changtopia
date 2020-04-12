CHANGPILE=node changlang/compiler.js

changlang/compiled_grammar.js:
	yarn nearleyc changlang/grammar.ne -o changlang/compiled_grammar.js

io.tbn: io.chang changlang/compiled_grammar.js
	${CHANGPILE} -i $< -o $@
list.tbn: list.chang changlang/compiled_grammar.js
	${CHANGPILE} -i $< -o $@

shell.tbn: shell.chang list.tbn io.tbn changlang/compiled_grammar.js
	${CHANGPILE} -i $< -o $@

os: shell.tbn
	node main.js shell.tbn

clean:
	rm *.tbn
