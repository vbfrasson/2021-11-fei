import fs from "fs";
import os from "os";
import { BigNumber } from "ethers";

import allHolders from "../merkle/2_balances.json";
import { config, ethers } from "hardhat";
import { IERC20__factory } from "../typechain";

const tribeAddress = "0xc7283b66Eb1EB5FB86327f08e1B5816b0720212B"; // tribe

const main = async () => {
  const startBlock = 13646000;

  const provider = new ethers.providers.WebSocketProvider(
    config.networks.hardhat.forking?.url.replace("http", "ws")!
  );
  const tribe = IERC20__factory.connect(tribeAddress, provider);
  let total = Object.entries(allHolders).length;
  let bad = 0;
  let idx = 0;
  let counter = 0;
  let promises = [];
  for (const [id, amt] of Object.entries(allHolders)) {
    if (id == "0x0000000000000000000000000000000000000000") {
      continue;
    }
    let c = tribe.balanceOf(id, { blockTag: startBlock }).then((bal) => {
      if (bal.toString() != amt) {
        bad = bad + 1;
        console.log(id, amt);
      }
    });
    promises.push(c);
    idx = idx + 1;
    counter = counter + 1;
    if (counter % 1000 == 0) {
      console.log(`checked: ${counter}/${total}`);
    }
    if (idx > 50) {
      await Promise.all(promises).catch(console.log);
      promises = [];
      idx = 0;
    }
  }
  console.log(`checked: ${total}/${total}... done!`);
  console.log(
    `found a total of ${bad} nonmatches in ${
      Object.entries(allHolders).length
    } accounts`
  );
  const enc = new TextEncoder();
  const foundhash = ethers.utils.keccak256(
    enc.encode(JSON.stringify(allHolders))
  );
  const checkinfo = {
    bad_entries: bad,
    total_holders: Object.entries(allHolders).length,
    hash: foundhash,
    run_at: new Date(),
    run_by: os.userInfo(),
  };
  fs.writeFileSync("merkle/3_checked.json", JSON.stringify(checkinfo));
  process.exit(0);
};

main().then(console.log).catch(console.log);
