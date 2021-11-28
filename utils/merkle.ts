import { BigNumberish } from "ethers";
import { keccak256, solidityKeccak256 } from "ethers/lib/utils";
import MerkleTree from "merkletreejs";
import { BigFromN } from "../test/util/stringn";

const hashFn = (data: string) => keccak256(data).slice(2);
export const treeFromObject = (obj: any): MerkleTree => {
  const elements = Object.entries(obj).map(([account, balance]) =>
    solidityKeccak256(
      ["address", "uint256"],
      [
        account,
        BigFromN(balance as any)
          .div(BigFromN("1e9"))
          .toString(),
      ]
    )
  );
  const tree = new MerkleTree(elements, hashFn, { sort: true });
  return tree;
};

export const getAccountProof = (
  tree: MerkleTree,
  account: string,
  amount: BigNumberish
) => {
  const element = solidityKeccak256(
    ["address", "uint256"],
    [account, amount.toString()]
  );
  return tree.getHexProof(element);
};
