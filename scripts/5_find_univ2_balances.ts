import fs from "fs";
import { BigNumber, ethers } from "ethers";

import allTransfer from "../merkle/4_univ2_transfers.json";
import { config } from "hardhat";
import { BigFromN } from "../test/util/stringn";

const poolAddress = "0x9928e4046d7c6513326ccea028cd3e7a91c7590a"; // fei-tribe univ2

const startBlock = 13646000;
const main = async () => {
  const balances: any = {};
  const balanceStrings: any = {};

  const iuniv2 = new ethers.utils.Interface([
    "function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 time)",
    "function totalSupply() external view returns (uint256)",
  ]);

  const provider = new ethers.providers.WebSocketProvider(
    config.networks.hardhat.forking?.url.replace("http", "ws")!
  );
  const univ2 = new ethers.Contract(poolAddress, iuniv2, provider);
  let reserves = await univ2.callStatic["getReserves"]({
    blockTag: startBlock,
  });
  let totalSupply = await univ2.callStatic["totalSupply"]({
    blockTag: startBlock,
  });
  const r0 = reserves[0];
  const r1 = reserves[1];
  console.log(Object.entries(allTransfer).length);
  for (const [id, trsf] of Object.entries(allTransfer)) {
    if (balances[trsf.from] == undefined) {
      balances[trsf.from] = BigNumber.from(0);
    }
    if (balances[trsf.to] == undefined) {
      balances[trsf.to] = BigNumber.from(0);
    }
    let tsb = BigNumber.from(trsf.amount);
    balances[trsf.from] = balances[trsf.from].sub(trsf.amount);
    balances[trsf.to] = balances[trsf.to].add(trsf.amount);
  }

  let total = BigNumber.from(0);
  for (const [k, v] of Object.entries(balances)) {
    if ((v as any).toString() != "0") {
      if ((v as any).gte(0)) {
        balances[k] = balances[k].mul(r1).div(totalSupply);
        balanceStrings[k] = balances[k].toString();
        total = total.add(balances[k]);
      }
    }
  }
  console.log(
    Object.entries(balances).length,
    "total",
    total.toString(),
    "match",
    r1.toString(),
    "diff",
    r1.sub(total).toString()
  );

  fs.writeFileSync(
    "merkle/5_univ2_tribe_balances.json",
    JSON.stringify(balanceStrings)
  );

  process.exit(0);
};

main().then(console.log).catch(console.log);
