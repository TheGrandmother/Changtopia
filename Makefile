CHANGPILE=node changlang/compiler.js

changlang/compiled_grammar.js: changlang/grammar.ne
	yarn nearleyc changlang/grammar.ne -o changlang/compiled_grammar.js

bob.tbn: bob.chang changlang/compiled_grammar.js
	${CHANGPILE} -i $< -o $@

io.tbn: io.chang changlang/compiled_grammar.js
	${CHANGPILE} -i $< -o $@

list.tbn: list.chang changlang/compiled_grammar.js
	${CHANGPILE} -i $< -o $@

shell.tbn: shell.chang bob.tbn list.tbn io.tbn changlang/compiled_grammar.js
	${CHANGPILE} -i $< -o $@

all: shell.tbn list.tbn io.tbn bob.tbn changlang/compiled_grammar.js

run: shell.tbn
	node main.js shell.tbn

clean:
	rm *.tbn
