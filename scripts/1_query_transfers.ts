import { config, ethers } from "hardhat";
import { IERC20, IERC20__factory } from "../typechain";
import fs from "fs";
import { BigNumber } from "ethers";

const tribeAddress = "0xc7283b66Eb1EB5FB86327f08e1B5816b0720212B"; // tribe

const main = async () => {
  const r = fs.existsSync("merkle/1_transfers.json");
  if (r) {
    console.log("(1) detected 1_transfers.json, skipping query");
    process.exit(0);
  }

  const startBlock = 13646000;
  const provider = new ethers.providers.WebSocketProvider(
    config.networks.hardhat.forking?.url.replace("http", "ws")!
  );
  const tribe = IERC20__factory.connect(tribeAddress, provider);
  const filter = tribe.filters.Transfer(undefined, undefined, undefined);
  const deployBlock = 12125703;
  const allTransfer: any = {};
  let currentBlock = deployBlock;
  let n = 42000;
  while (true) {
    if (currentBlock + n > startBlock) {
      n = startBlock - currentBlock;
    }
    try {
      let currentLogs = await tribe.queryFilter(
        filter,
        currentBlock,
        currentBlock + n
      );
      console.log(currentBlock, currentBlock + n, currentLogs.length);
      currentBlock = currentBlock + n + 1;
      for (const log of currentLogs) {
        const parsed = tribe.interface.parseLog(log);
        allTransfer[`${log.transactionHash}_${log.logIndex}`] = {
          from: parsed.args[0],
          to: parsed.args[1],
          amount: parsed.args[2].toString(),
        };
      }
      if (currentLogs.length < 1000) {
        n = 30000;
      }
    } catch (e) {
      n = 2000;
      continue;
    }
    if (currentBlock >= startBlock) {
      break;
    }
  }
  fs.writeFileSync("merkle/1_transfers.json", JSON.stringify(allTransfer));
  console.log("done!");
  process.exit(0);
};

main().then(console.log).catch(console.log);
