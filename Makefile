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
