import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import merkleWallets from "./data/ragequit_data.json";
import { ethers, network } from "hardhat";
import { createTree } from "./merkle";
import { Deployment, TestContracts } from "./util/contractor";
import { showHeader, showBody } from "./util/format";
import { approveMoney, getMoney, stealMoney } from "./util/money";
import { BigFromN } from "./util/stringn";
import { getAccountProof } from "../utils/merkle";
import { execute_rari_governance } from "./governance/sim_rari";
import {
  execute_tribe_governance,
  propose_tribe_governance,
} from "./governance/sim_tribe";
import { Addresser } from "./util/addresser";
import { advanceBlockHeight, fastForward } from "./util/block";

const tribeHaverAddress = "0x28c6c06298d514db089934071355e5743bf21d60";
const rgtHaverAddress = "0x20017a30d3156d4005bda08c40acda0a6ae209b1";
const contracts = Deployment;
let deployer: SignerWithAddress,
  alice: SignerWithAddress,
  bob: SignerWithAddress,
  carol: SignerWithAddress,
  dave: SignerWithAddress,
  ethan: SignerWithAddress;
let ganga: Array<SignerWithAddress>;

const gangBase = BigFromN("1e22");

const merkletree = createTree();
showBody("root:", merkletree.getHexRoot());

const first = async () => {
  [deployer, alice, bob, carol, dave, ethan] = await ethers.getSigners();
  ganga = [deployer, alice, bob, carol, dave, ethan];
  await contracts.deploy(deployer);
};

describe("deployment", () => {
  it("deploy contracts", first);

  it(`should be able to call requery`, async () => {
    await contracts.tribeRagequit?.requery();
  });
});
describe("governance", () => {});

describe("setup mocking", () => {
  it(`robbery should be successful (0)`, async () => {
    await stealMoney(
      tribeHaverAddress,
      contracts.pegExchanger?.address as string,
      Addresser.tribeTokenAddress,
      "1e24"
    );
  });

  it(`robbery should be successful`, async () => {
    for (let i = 1; i < 6; i++) {
      const member = ganga[i];
      await stealMoney(
        rgtHaverAddress,
        member.address,
        Addresser.rgtTokenAddress,
        gangBase
      );
      await stealMoney(
        tribeHaverAddress,
        member.address,
        Addresser.tribeTokenAddress,
        gangBase
      );
      expect(
        await getMoney(member.address, Addresser.rgtTokenAddress)
      ).to.be.equal(BigFromN("1e22"));
      expect(
        await getMoney(member.address, Addresser.tribeTokenAddress)
      ).to.be.equal(BigFromN("1e22"));
    }
  });
});

describe("deployed contract address checks", () => {
  before(async () => {
    showHeader("rariTimelock:", Addresser.rgtTimelockAddress);
    showBody("tribeTimelock:", Addresser.tribeTimelockAddress);
    showBody("feiToken:", Addresser.feiTokenAddress);
    showBody("tribeToken:", Addresser.tribeTokenAddress);
    showBody("rgtToken:", Addresser.rgtTokenAddress);
  });
  it("rgt=>tribe addresses should match", async () => {
    expect(await contracts.pegExchanger?.party0Timelock()).to.hexEqual(
      Addresser.rgtTimelockAddress
    );
    expect(await contracts.pegExchanger?.party1Timelock()).to.hexEqual(
      Addresser.tribeTimelockAddress
    );
    expect(await contracts.pegExchanger?.token0()).to.hexEqual(
      Addresser.rgtTokenAddress
    );
    expect(await contracts.pegExchanger?.token1()).to.hexEqual(
      Addresser.tribeTokenAddress
    );
  });
  it("tribe=>fei addresses should match", async () => {
    expect(await contracts.tribeRagequit?.party0Timelock()).to.hexEqual(
      Addresser.rgtTimelockAddress
    );
    expect(await contracts.tribeRagequit?.party1Timelock()).to.hexEqual(
      Addresser.tribeTimelockAddress
    );
    expect(await contracts.tribeRagequit?.token0()).to.hexEqual(
      Addresser.tribeTokenAddress
    );
    expect(await contracts.tribeRagequit?.token1()).to.hexEqual(
      Addresser.feiTokenAddress
    );
  });
});

describe("atomic timelock AND-GATE logic", () => {
  it("alice should not be able to exchange/ragequit on any contract", async () => {
    await approveMoney(
      alice.address,
      contracts.pegExchanger?.address as string,
      Addresser.rgtTokenAddress,
      "1e22"
    );
    await expect(
      contracts.pegExchanger?.connect(alice).exchange(1)
    ).to.be.revertedWith("Proposals are not both passed");

    await expect(
      contracts.tribeRagequit?.connect(alice).ngmi(1, 1, [])
    ).to.be.revertedWith("Proposals are not both passed");
  });
  it("Accept permission reverts for incorrect party, contracts disabled after", async () => {
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [Addresser.rgtTimelockAddress],
    });
    const timelock_party0 = await ethers.getSigner(
      Addresser.rgtTimelockAddress
    );
    await expect(
      contracts.pegExchanger?.connect(timelock_party0).party1Accept()
    ).to.be.reverted;
    await expect(
      contracts.tribeRagequit?.connect(timelock_party0).party1Accept()
    ).to.be.reverted;
    await network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [Addresser.rgtTimelockAddress],
    });

    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [Addresser.tribeTimelockAddress],
    });
    const timelock_party1 = await ethers.getSigner(
      Addresser.tribeTimelockAddress
    );
    await expect(
      contracts.pegExchanger?.connect(timelock_party1).party0Accept()
    ).to.be.reverted;
    await expect(
      contracts.tribeRagequit?.connect(timelock_party1).party0Accept()
    ).to.be.reverted;
    await network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [Addresser.tribeTimelockAddress],
    });
    expect(await contracts.pegExchanger?.isEnabled()).to.be.false;
    expect(await contracts.tribeRagequit?.isEnabled()).to.be.false;
  });

  describe("tribe passes governance", async () => {
    propose_tribe_governance();
  });

  describe("rari passes+executes governance", () => {
    execute_rari_governance();
    it("contracts still disabled after", async () => {
      expect(await contracts.pegExchanger?.isEnabled()).to.be.false;
      expect(await contracts.tribeRagequit?.isEnabled()).to.be.false;
      await expect(
        contracts.pegExchanger?.connect(alice).exchange(1)
      ).to.be.revertedWith("Proposals are not both passed");
      await expect(
        contracts.tribeRagequit?.connect(alice).ngmi(1, 1, [])
      ).to.be.revertedWith("Proposals are not both passed");
    });
  });

  describe("tribe executes governance", () => {
    execute_tribe_governance();
    it("Contracts enabled after", async () => {
      expect(await contracts.pegExchanger?.isEnabled()).to.be.true;
      expect(await contracts.tribeRagequit?.isEnabled()).to.be.true;
    });
  });
});

describe("rgt => tribe swap", () => {
  it(`rate should match initialized rate`, async () => {
    const inbase = await contracts.pegExchanger?.token0InBase();
    const outbase = await contracts.pegExchanger?.token1OutBase();
    showHeader(
      "in:",
      inbase?.toString(),
      "out:",
      outbase?.toString(),
      "px:",
      "one RGT converts to",
      outbase?.toNumber()! / inbase?.toNumber()!,
      "tribe"
    );
    expect(inbase).to.equal(1000000);
    expect(outbase).to.equal(26705673);
  });
  it(`wallets should be able to redeem at the correct ratio`, async () => {
    for (let i = 1; i < 6; i++) {
      const inbase = await contracts.pegExchanger?.token0InBase();
      const outbase = await contracts.pegExchanger?.token1OutBase();
      await approveMoney(
        ganga[i].address,
        contracts.pegExchanger?.address as string,
        Addresser.rgtTokenAddress,
        "1e22"
      );
      const convertMultiplier = BigFromN("1e15")
        .mul(Math.floor(Math.random() * 1e8))
        .div(1e8)
        .add(Math.floor(Math.random() * 1e8));
      showHeader("name:", ganga[i].address, "multiplier:", convertMultiplier);
      await expect(
        contracts.pegExchanger?.connect(ganga[i]).exchange(convertMultiplier)
      ).to.not.be.reverted;
      const expectTaken = convertMultiplier.mul(inbase!);
      const expectGiven = convertMultiplier.mul(outbase!);

      showBody("take:", expectTaken, "give:", expectGiven);
      expect(
        await getMoney(ganga[i].address, Addresser.rgtTokenAddress)
      ).to.be.equal(gangBase.sub(expectTaken));
      expect(
        await getMoney(ganga[i].address, Addresser.tribeTokenAddress)
      ).to.be.equal(gangBase.add(expectGiven));
    }
  });
});

describe("tribe => fei swap", () => {
  it("protocol equity should be above zero", async () => {
    const equity = await contracts.tribeRagequit?.minProtocolEquity();
    const inbase = await contracts.tribeRagequit?.token0InBase();
    const outbase = await contracts.tribeRagequit?.token1OutBase();
    const ratio = outbase?.toNumber()! / inbase?.toNumber()!;
    showHeader(
      "equity:",
      equity,
      "in:",
      inbase,
      "out:",
      outbase,
      "px:",
      "$" + ratio
    );
    expect(equity).to.not.equal(0);
    expect(inbase).to.be.below(BigFromN("1e88"));
    expect(outbase).to.not.equal(0);
    // sanity check
    expect(ratio).to.be.above(0.5).and.to.be.below(2);
  });

  it("merkle root should match", async () => {
    const root = await contracts.tribeRagequit?.merkleRoot();
    expect(root).to.equal(merkletree.getHexRoot());
  });

  it("bad proof should be rejected", async () => {
    const claimArray = Object.entries(merkleWallets);
    const addr = claimArray[2][0];
    const amt = claimArray[3][1];
    const convertMultiplier = BigFromN(amt).div(BigFromN("1e6"));
    await expect(
      contracts.tribeRagequit
        ?.connect(addr)
        .ngmi(
          convertMultiplier,
          convertMultiplier,
          getAccountProof(merkletree, addr, convertMultiplier)
        )
    ).to.be.revertedWith("invalid proof");
  });

  const quitters = 1;
  it(`random quitters should be able to claim (or revert if no coin)`, async () => {
    for (let j = 1; j <= quitters; j++) {
      const claimArray = Object.entries(merkleWallets);
      const len = claimArray.length;
      let i = Math.floor(Math.random() * len);

      const addr = claimArray[i][0];
      const amt = claimArray[i][1];
      const inbase = await contracts.tribeRagequit?.token0InBase();
      const outbase = await contracts.tribeRagequit?.token1OutBase();
      await deployer.sendTransaction({
        to: addr,
        value: ethers.utils.parseEther(".1"),
      });
      const convertMultiplier = BigFromN(amt).div(BigFromN("1e9"));
      const expectTaken = convertMultiplier.mul(inbase!);
      const expectGiven = convertMultiplier.mul(outbase!);
      const startingFei = await getMoney(addr, Addresser.feiTokenAddress);
      const startingTribe = await getMoney(addr, Addresser.tribeTokenAddress);
      await expect(
        approveMoney(
          addr,
          contracts.tribeRagequit?.address as string,
          Addresser.tribeTokenAddress,
          expectTaken
        )
      ).not.to.be.reverted;
      await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [addr],
      });
      showHeader("name:", addr, "balance:", startingTribe);
      const claimer = await ethers.getSigner(addr);
      const proof = getAccountProof(merkletree, addr, convertMultiplier);
      const rqTxn = contracts.tribeRagequit
        ?.connect(claimer)
        .ngmi(convertMultiplier, convertMultiplier, proof);
      if (startingTribe.lt(amt)) {
        showBody("required:", amt);
        await expect(rqTxn).to.be.reverted;
      } else {
        showBody(
          "amount:",
          convertMultiplier,
          "take:",
          expectTaken,
          "give:",
          expectGiven
        );
        await expect(rqTxn).to.not.be.reverted;
        expect(await getMoney(addr, Addresser.tribeTokenAddress)).to.be.equal(
          startingTribe.sub(expectTaken)
        );
        expect(await getMoney(addr, Addresser.feiTokenAddress)).to.be.equal(
          startingFei.add(expectGiven)
        );
      }
      await network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [addr],
      });
    }
  });
  it(`partial claims should pass`, async () => {
    for (let j = 1; j <= 10; j++) {
      const claimArray = Object.entries(merkleWallets);
      let i = 804;
      const addr = claimArray[i][0];
      const amt = claimArray[i][1];
      const inbase = await contracts.tribeRagequit?.token0InBase();
      const outbase = await contracts.tribeRagequit?.token1OutBase();
      await deployer.sendTransaction({
        to: addr,
        value: ethers.utils.parseEther(".1"),
      });

      const key = BigFromN(amt).div(BigFromN("1e9"));
      const convertMultiplier = BigFromN(amt).div(BigFromN("1e10"));
      const expectTaken = convertMultiplier.mul(inbase!);
      const expectGiven = convertMultiplier.mul(outbase!);
      const startingFei = await getMoney(addr, Addresser.feiTokenAddress);
      const startingTribe = await getMoney(addr, Addresser.tribeTokenAddress);
      await expect(
        approveMoney(
          addr,
          contracts.tribeRagequit?.address as string,
          Addresser.tribeTokenAddress,
          expectTaken
        )
      ).not.to.be.reverted;
      await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [addr],
      });
      const claimer = await ethers.getSigner(addr);
      const proof = getAccountProof(merkletree, addr, key);
      await expect(
        contracts.tribeRagequit
          ?.connect(claimer)
          .ngmi(convertMultiplier, key, proof)
      ).to.not.be.reverted.and.to.not.be.revertedWith("invalid proof");

      await network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [addr],
      });
      expect(await getMoney(addr, Addresser.tribeTokenAddress)).to.equal(
        startingTribe.sub(expectTaken)
      );
      expect(await getMoney(addr, Addresser.feiTokenAddress)).to.equal(
        startingFei.add(expectGiven)
      );
    }
  });
  it(`this partial claim should fail`, async () => {
    const claimArray = Object.entries(merkleWallets);
    let i = 804;
    const addr = claimArray[i][0];
    const amt = claimArray[i][1];
    const inbase = await contracts.tribeRagequit?.token0InBase();
    const outbase = await contracts.tribeRagequit?.token1OutBase();
    await deployer.sendTransaction({
      to: addr,
      value: ethers.utils.parseEther(".1"),
    });

    const key = BigFromN(amt).div(BigFromN("1e9"));
    const convertMultiplier = BigFromN(amt).div(BigFromN("1e10"));
    const expectTaken = convertMultiplier.mul(inbase!);
    const expectGiven = convertMultiplier.mul(outbase!);
    const startingFei = await getMoney(addr, Addresser.feiTokenAddress);
    const startingTribe = await getMoney(addr, Addresser.tribeTokenAddress);
    await expect(
      approveMoney(
        addr,
        contracts.tribeRagequit?.address as string,
        Addresser.tribeTokenAddress,
        expectTaken
      )
    ).not.to.be.reverted;
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [addr],
    });
    const claimer = await ethers.getSigner(addr);
    const proof = getAccountProof(merkletree, addr, key);
    await expect(
      contracts.tribeRagequit
        ?.connect(claimer)
        .ngmi(convertMultiplier, key, proof)
    ).to.be.revertedWith("already ragequit all");

    await network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [addr],
    });
    expect(await getMoney(addr, Addresser.tribeTokenAddress)).to.not.equal(
      startingTribe.sub(expectTaken)
    );
    expect(await getMoney(addr, Addresser.feiTokenAddress)).to.not.equal(
      startingFei.add(expectGiven)
    );
  });
});

describe("pass a few blocks", () => {
  it("contract disabled after", async () => {
    await fastForward(10000);
    await advanceBlockHeight(100000);
    await expect(
      contracts.tribeRagequit?.connect(alice).ngmi(1, 1, [])
    ).to.be.revertedWith("Redemption period is over");
  });
});
