import fs from "fs";
import { BigNumber, ethers } from "ethers";

import allTransfer from "../merkle/6_ftribe_transfers.json";
import { config } from "hardhat";
import { BigFromN } from "../test/util/stringn";

const poolAddress = "0xFd3300A9a74b3250F1b2AbC12B47611171910b07"; // ftribe

const startBlock = 13646000;
const main = async () => {
  const balances: any = {};
  const balanceStrings: any = {};

  const iftribe = new ethers.utils.Interface([
    "function totalSupply() external view returns (uint256)",
    "function exchangeRateStored() external view returns (uint256)",
  ]);

  const provider = new ethers.providers.WebSocketProvider(
    config.networks.hardhat.forking?.url.replace("http", "ws")!
  );
  const ftribe = new ethers.Contract(poolAddress, iftribe, provider);
  let exchRate = await ftribe.callStatic["exchangeRateStored"]({
    blockTag: startBlock,
  });
  let totalSupply = await ftribe.callStatic["totalSupply"]({
    blockTag: startBlock,
  });
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
    balances[k] = balances[k].mul(exchRate).div(BigFromN("1e18"));
    if ((balances[k] as any).toString() != "0") {
      if ((balances[k] as any).gte(0)) {
        balanceStrings[k] = balances[k].toString();
        total = total.add(balances[k]);
      }
    }
  }
  console.log(
    Object.entries(balances).length,
    "total",
    total.toString(),
    "supply",
    totalSupply.toString(),
    "sanity",
    totalSupply.mul(exchRate).div(BigFromN("1e18")).sub(total).toString()
  );

  fs.writeFileSync(
    "merkle/7_ftribe_tribe_balances.json",
    JSON.stringify(balanceStrings)
  );

  process.exit(0);
};

main().then(console.log).catch(console.log);
