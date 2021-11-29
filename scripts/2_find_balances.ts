import fs from "fs";
import { BigNumber } from "ethers";

import allTransfer from "../merkle/1_transfers.json";

const rgtAddress = "0xD291E7a03283640FDc51b121aC401383A46cC623"; // rgt
const tribeAddress = "0xc7283b66Eb1EB5FB86327f08e1B5816b0720212B"; // tribe

const main = async () => {
  const balances: any = {};
  const balanceStrings: any = {};

  console.log(Object.entries(allTransfer).length);
  for (const [id, trsf] of Object.entries(allTransfer)) {
    if (balances[trsf.from] == undefined) {
      balances[trsf.from] = BigNumber.from(0);
    }
    if (balances[trsf.to] == undefined) {
      balances[trsf.to] = BigNumber.from(0);
    }
    balances[trsf.from] = balances[trsf.from].sub(trsf.amount);
    balances[trsf.to] = balances[trsf.to].add(trsf.amount);
  }

  let total = BigNumber.from(0);
  for (const [k, v] of Object.entries(balances)) {
    if ((v as any).toString() != "0") {
      balanceStrings[k] = balances[k].toString();
      balanceStrings[k] = balances[k].toString();
      total = total.add(balances[k]);
    }
  }
  delete balances["0x0000000000000000000000000000000000000000"];
  delete balanceStrings["0x0000000000000000000000000000000000000000"];

  console.log(total);

  fs.writeFileSync("merkle/2_balances.json", JSON.stringify(balanceStrings));
  console.log(Object.entries(balances).length);
  process.exit(0);
};

main().then(console.log).catch(console.log);
