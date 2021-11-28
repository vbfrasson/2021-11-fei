import { BigNumber, BigNumberish } from "ethers";
import { keccak256, solidityKeccak256 } from "ethers/lib/utils";
import MerkleTree from "merkletreejs";
import merkleWallets from "./data/ragequit_data.json";
import { BigFromN } from "./util/stringn";
const hashFn = (data: string) => keccak256(data).slice(2);
export const createTree = (): MerkleTree => {
  const elements = Object.entries(merkleWallets).map(([account, balance]) =>
    solidityKeccak256(
      ["address", "uint256"],
      [account, BigFromN(balance).div(BigFromN("1e9")).toString()]
    )
  );
  const tree = new MerkleTree(elements, hashFn, { sort: true });
  return tree;
};
