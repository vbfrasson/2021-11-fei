# Fei Protocol contest details
- $28,500 USDC main award pot
- $1,500 USDC gas optimization award pot
- Join [C4 Discord](https://discord.gg/code4rena) to register
- Submit findings [using the C4 form](https://code4rena.com/contests/2021-11-fei-protocol-contest/submit)
- [Read our guidelines for more details](https://docs.code4rena.com/roles/wardens)
- Starts November 30, 2021 00:00 UTC
- Ends December 2, 2021 23:59 UTC

This repo will be made public before the start of the contest. (C4 delete this line when made public)


# Code Arena: Tribe/RGT Merger
#
| Glossary|Description|Address|
|-------------------------------|------------------------------------------------------|------------|
| TRIBE (Tribe)| ERC20 governance token for Fei Protocol|0xc7283b66eb1eb5fb86327f08e1b5816b0720212b|
| RGT (Rari Governance Token)| ERC20 governance token for Rari Capital |0xD291E7a03283640FDc51b121aC401383A46cC623|
| FEI (Fei) | Algo-Stablecoin |0x956F47F50A910163D8BF957Cf5846D573E7f87CA|
| PegExchanger | Contract which facilitates RGT->TRIBE conversions |To Be Deployed|
| TribeRagequit | Contract which facilitates TRIBE->FEI conversions |To Be Deployed|
| TribeTimelock | Timelock contract for Tribe governance |0xd51dba7a94e1adea403553a8235c302cebf41a3c|
| RgtTimelock | Timelock contract for RGT governance |0x8ace03fc45139fddba944c6a4082b604041d19fc|
| Oracle | Tribe collaterizationOracle which gives information on the Fei protocol for exchange| 0xd1866289B4Bd22D453fFF676760961e0898EE9BF|


## Project overview

This repo contains the contracts & simulations to facilitate the proposed merger of the TRIBE and FEI DAOs.

One contract facilitates the token exchange of RGT to TRIBE, given that the protocol merger proposal passed on both protocols.

The other contract facilitates the token exchange of TRIBE to FEI, an option given only to those who held TRIBE, fTRIBE, or had a stake in the UniV2 TRIBE-FEI LP pool. The merkle root is the following: 0x04170710c105bbd5d0e7df59842638c8229c73808c4e1bc7ccd2547d5c7ba428

Both contracts require the timelocks of both DAOs to submit a transaction confirming that they want the contract to be activated, and only then may users exchange their RGT or claim their FEI. We can facilitate a trustless token buyout with the smart contract as an escrow with this system in place.

Also in scope for this competition, there are three simulations that together describe a relatively trustless governance process.

Finally, we detail the process in which the merkle tree was generated, using the set of scripts in ./scripts/

These produce output in the folder ./merkle/, each script producing output with matching numeric header

Example output used to generate the existing merkle tree is in directory `./sample_merkle`

To run from scratch, source each step in order with `npx hardhat run ./scripts/n_xyz.ts`

Alternatively, then type `make merkle`. This script will resume from the latest completed step (indicated by prescence of file).


## Smart Contracts
All the contracts in this section are to be reviewed. Any contracts not on this list are to be ignored for this contest.

#### PegExchanger.sol (76 lines)
Summary: Contract which allows RGT to be swapped for TRIBE at a pre-specified ratio.

 - Takes RGT from the account attempting to swap
 - The exchange rate is hard-coded and should not change
 - TRIBE is to be sent to the PegExchanger before any swaps are completed

Externally Calls:
 - IERC20(0xD291E7a03283640FDc51b121aC401383A46cC623) // RGT
     - method `transferFrom`
 - IERC20(0xc7283b66Eb1EB5FB86327f08e1B5816b0720212B) // TRIBE
     - method `transferFrom`


#### TribeRagequit.sol (167 lines)
Summary: Contract which allows previous TRIBE holders to swap their TRIBE for FEI at intrinsic value.

  - Only swaps TRIBE for accounts on the merkle root, up to their allotted  quantity
  - The exchange rate is determined by the lowest received equity value from the FEI Collateralization Oracle
  - FEI is minted by the contract, and the deployed address will be added as a valid minter by the FEI protocol
  - The Ragequit window closes 3-days after the block of each parties accepting the proposal.

Externally Calls:
- IERC20(0xc7283b66Eb1EB5FB86327f08e1B5816b0720212B); // TRIBE
    - method: `transferFrom`
- IERC20(0x956F47F50A910163D8BF957Cf5846D573E7f87CA); // FEI
    - method:  `mint`
- IOracle(0xd1866289B4Bd22D453fFF676760961e0898EE9BF); // collateralizationOracle w/ caching
    - method: `pcvStats`

#### Additional Info

There are no external libraries used.

Exchangers will be left with an amount of dust equal to `balance % token0InBase`. This is expected.

#### Areas of concern

The most complicated part of this contract is the validation of the merkle tree. While the logic is ripped from OZ, there could still be issues within their implementation.

Beyond that, both contracts are rather short (~250 lines total), and so every piece of logic, regardless of how trivial, is and therefore should be thought of as incredibly critical.

Factors related to the process in the use of these contracts may also be considered, such as but not limited to an attacker's ability to rehypothecate and infinitely exchange funds.

## Simulations

There are three simulations within scope located within `./test/governance`. These simulations, when run in context, must be run in the following order:

1. execute_tribe_governance
2. execute_rgt_governance
3. execute_tribe_acceptAdmin

Tribe must be the first mover on governance by sending TRIBE to the PegExchanger and setting the Ragequit contract as minter. Both of these actions pose no loss to Tribe Governance if Rari does not vote YES on their side of the deal, for they can mint more TRIBE.

If Rari was the first mover on governance, Tribe Governance could rug by simply voting "no" on the vote, then accepting adminship.

The Tribe Governance vote MUST be completed & passed before the RGT Governance vote to ensure that RGT Governance may vote "no" or even not propose if Tribe Governance does not make the first move.

An example of a full simulation containing token deployments can be found at `./test/full_sim.ts`

#### propose_tribe_governance (`./test/governance/sim_tribe.ts`)
This simulation first creates a proposal to perform the following actions:
1. Mints more tribe
2. Send tribe to the PegExchanger
3. Set the TribeRagequit as a minter
4. calls method `party1Accept` on PegExchanger
5. calls method `party1Accept` on TribeRagequit
6. sends TRIBE to GFX Labs.
7. accepts adminship of rari timelock
8. executes transfer of rari contracts

#### execute_tribe_governance (`./test/governance/sim_tribe.ts`)
This simulation executes the above proposal
1. Mints more tribe
2. Send tribe to the PegExchanger
3. Set the TribeRagequit as a minter
4. calls method `party1Accept` on PegExchanger
5. calls method `party1Accept` on TribeRagequit
6. sends TRIBE to GFX Labs.
7. accepts adminship of rari timelock
8. executes transfer of rari contracts


#### execute_rgt_governance (``/test/governance/sim_rari.ts`)
This simulation first creates a proposal to perform the following actions:
1. set the pendingAdmin of the RgtTimelock contract to the TribeTimelock.
2. calls method `party0Accept` on PegExchanger
3. calls method `party0Accept` on TribeRagequit
4. queues transfer of rari contracts

It then simulates a voting period, after which the proposal is passed & executed.

#### execute_tribe_acceptAdmin (`./test/governance/sim_tribe.ts`)
This simulation first creates a proposal to perform the following actions:
1. Accepts adminship of the RgtTimelock

It then simulates a voting period, after which the proposal is passed & executed.


#### Additional Info

The contracts used by these simulations are within test/addresser.ts

## Environment

The environment is a standard hardhat repo with a makefile just to shorthand some commands.

Setup Instructions:
1. rename `SAMPLE.env` to ``.env`
2. replace URL within `.env` to an archive RPC node

### Compile
1. `npm i`
2. `npx hardhat clean`
3. `npx hardhat compile`

### Tests
A single simulation is provided in the repo. To run, do the following:
1. `npm i`
2. `npx hardhat test test/full_sim.ts`
This is a simulation of the full governance process, along with a few redemptions. While the simulation is comprehensive, it should be taken at face value: a single scenario and nothing more.
