import fs from "fs";
import os from "os";
import { BigNumber } from "ethers";

import tribeHolders from "../merkle/2_balances.json";
import univ2Holders from "../merkle/5_univ2_tribe_balances.json";
import ftribeHolders from "../merkle/7_ftribe_tribe_balances.json";

import { config, ethers } from "hardhat";
import { IERC20__factory } from "../typechain";
import { treeFromObject } from "../utils/merkle";

const blacklist = [
  "0xc7283b66Eb1EB5FB86327f08e1B5816b0720212B", // ftribe
  "0x9928e4046d7c6513326ccea028cd3e7a91c7590a", // fei-tribe univ2
];

const sortObject = (o: any) =>
  Object.keys(o)
    .sort()
    .reduce((r, k) => (((r as any)[k] = o[k]), r), {});
const main = async () => {
  const startBlock = 13646000;

  const combined: any = {};
  for (const [id, amt] of Object.entries(tribeHolders)) {
    if (combined[id] == undefined) {
      combined[id] = BigNumber.from(0);
    }
    combined[id] = combined[id].add(amt);
  }

  for (const [id, amt] of Object.entries(univ2Holders)) {
    if (combined[id] == undefined) {
      combined[id] = BigNumber.from(0);
    }
    combined[id] = combined[id].add(amt);
  }

  for (const [id, amt] of Object.entries(ftribeHolders)) {
    if (combined[id] == undefined) {
      combined[id] = BigNumber.from(0);
    }
    combined[id] = combined[id].add(amt);
  }
  const tree = treeFromObject(combined);
  for (const [id, amt] of Object.entries(sortObject(combined))) {
    combined[id] = combined[id].toString();
  }
  const checkinfo = {
    root: tree.getHexRoot(),
    total_holders: Object.entries(combined).length,
    run_at: new Date(),
    run_by: os.userInfo(),
  };
  fs.writeFileSync(
    "merkle/8_final_tribe_credits.json",
    JSON.stringify(combined)
  );
  console.log("finished job 8");
  console.log(checkinfo);
  fs.writeFileSync("merkle/8_merkle_tree.json", JSON.stringify(checkinfo));
  process.exit(0);
};

main().then(console.log).catch(console.log);
