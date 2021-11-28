import { ethers } from "ethers";
import MerkleTree from "merkletreejs";
import {
  PegExchanger,
  PegExchanger__factory,
  TRIBERagequit,
  TRIBERagequit__factory,
} from "../../typechain";
import { createTree } from "../merkle";

export class TestContracts {
  pegExchanger?: PegExchanger;
  tribeRagequit?: TRIBERagequit;
  deployed: boolean;
  merkletree: MerkleTree;
  constructor(tree: MerkleTree) {
    this.deployed = false;
    this.merkletree = tree;
  }
  async deploy(deployer: ethers.Signer) {
    if (this.deployed) {
      return;
    }
    this.pegExchanger = await new PegExchanger__factory(deployer).deploy();
    this.tribeRagequit = await new TRIBERagequit__factory(deployer).deploy(
      this.merkletree.getHexRoot()
    );
    this.deployed = true;
    return;
  }
}

export const Deployment = new TestContracts(createTree());
