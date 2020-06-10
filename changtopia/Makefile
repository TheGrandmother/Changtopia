CHANGPILE=node changlang/standalone.js -k

SRC=changfiles
BIN=tbn_modules

MODULES=$(patsubst $(SRC)/%.chang, $(BIN)/%.tbn, $(wildcard changfiles/*.chang))

CHANGLANG_PATTERN=$(wildcard changlang/**/*.js) $(wildcard changlang/*.js)

changlang/compiled_grammar.js: changlang/grammar.ne
	yarn nearleyc changlang/grammar.ne -o changlang/compiled_grammar.js

# ${BIN}/bob.tbn: ${SRC}/bob.chang changlang/compiled_grammar.js
# 	${CHANGPILE} -i $< -o $@
# 
# ${BIN}/io.tbn: ${SRC}/io.chang changlang/compiled_grammar.js
# 	${CHANGPILE} -i $< -o $@
# 
# ${BIN}/list.tbn: ${SRC}/list.chang changlang/compiled_grammar.js
# 	${CHANGPILE} -i $< -o $@
# 
# ${BIN}/utils.tbn: ${SRC}/utils.chang changlang/compiled_grammar.js
# 	${CHANGPILE} -i $< -o $@
# 
# ${BIN}/dead.tbn: ${SRC}/dead.chang changlang/compiled_grammar.js
# 	${CHANGPILE} -i $< -o $@
# 
# ${BIN}/shell.tbn: ${SRC}/shell.chang ${BIN}/bob.tbn ${BIN}/dead.tbn ${BIN}/list.tbn ${BIN}/io.tbn ${BIN}/utils.tbn changlang/compiled_grammar.js
# 	${CHANGPILE} -i $< -o $@
# 
${BIN}/%.tbn : ${SRC}/%.chang ${CHANGLANG_PATTERN}
	${CHANGPILE} -i $< -o $@

all: ${MODULES}

run: ${MODULES}
	node main.js tbn_modules/shell.tbn

clean:
	rm tbn_modules/*.tbn
