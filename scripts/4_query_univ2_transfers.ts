import { config, ethers } from "hardhat";
import { IERC20, IERC20__factory } from "../typechain";
import fs from "fs";
import { BigNumber } from "ethers";

const poolAddress = "0x9928e4046d7c6513326ccea028cd3e7a91c7590a"; // fei-tribe univ2

const main = async () => {
  const startBlock = 13646000;
  const provider = new ethers.providers.WebSocketProvider(
    config.networks.hardhat.forking?.url.replace("http", "ws")!
  );
  const erc20 = IERC20__factory.connect(poolAddress, provider);
  const filter = erc20.filters.Transfer(undefined, undefined, undefined);
  const deployBlock = 12125703;
  const allTransfer: any = {};
  let currentBlock = deployBlock;
  let n = 42000;
  while (true) {
    if (currentBlock + n > startBlock) {
      n = startBlock - currentBlock;
    }
    try {
      let currentLogs = await erc20.queryFilter(
        filter,
        currentBlock,
        currentBlock + n
      );
      console.log(currentBlock, currentBlock + n, currentLogs.length);
      currentBlock = currentBlock + n + 1;
      for (const log of currentLogs) {
        const parsed = erc20.interface.parseLog(log);
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
  fs.writeFileSync(
    "merkle/4_univ2_transfers.json",
    JSON.stringify(allTransfer)
  );
  console.log("done!");
  process.exit(0);
};

main().then(console.log).catch(console.log);
