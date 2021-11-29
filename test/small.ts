import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, network } from "hardhat";
import { TestContracts } from "./util/contractor";
import { approveMoney, getMoney, stealMoney } from "./util/money";
import { BigFromN } from "./util/stringn";

const rgtAddress = "0xD291E7a03283640FDc51b121aC401383A46cC623"; // rgt
const tribeAddress = "0xc7283b66Eb1EB5FB86327f08e1B5816b0720212B"; // tribe
const feiAddress = "0x956F47F50A910163D8BF957Cf5846D573E7f87CA"; // fei
const rariTimelockAddress = "0x8ace03Fc45139fDDba944c6A4082b604041d19FC"; // rgt timelock
const tribeTimelockAddress = "0xd51dbA7a94e1adEa403553A8235C302cEbF41a3c"; // tribe timelock

const tribeHaverAddress = "0x28c6c06298d514db089934071355e5743bf21d60";
const rgtHaverAddress = "0x20017a30d3156d4005bda08c40acda0a6ae209b1";
let contracts: TestContracts;
let deployer: SignerWithAddress,
  alice: SignerWithAddress,
  bob: SignerWithAddress,
  carol: SignerWithAddress,
  dave: SignerWithAddress,
  ethan: SignerWithAddress;
let ganga: Array<SignerWithAddress>;

const main = async () => {
  [deployer, alice, bob, carol, dave, ethan] = await ethers.getSigners();
  ganga = [deployer, alice, bob, carol, dave, ethan];
  contracts = new TestContracts();
  await contracts.deploy(deployer);
  console.log("deployed");
};

main().catch(console.log);
