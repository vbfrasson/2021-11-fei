.PHONY: all test clean merkle

all: setup clean hardhat

hardhat: clean
	npx hardhat compile

test: hardhat
	npx hardhat test test/full_sim.ts

testclean: setup clean hardhat
	npx hardhat test test/full_sim.ts

clean:
	npx hardhat clean

setup:
	npm i

script_dir := ./scripts
output_dir := ./merkle
script_files := $(sort $(wildcard $(script_dir)/*.ts))
merkle: $(script_files)
	for file in $^ ; do \
	  a="`echo $${file#scripts/} | head -c 1`" ;\
		if ls $(output_dir)/$$a* >/dev/null 2>&1  ;\
		then \
		echo "found data for ($$a), not rerunning" ;\
		else \
		echo "no data for ($$a), generating" ;\
		npx hardhat run $$file ;\
		fi ;\
		done
