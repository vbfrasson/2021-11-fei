import { advanceBlockHeight, fastForward } from "../util/block";
import { ethers, network } from "hardhat";
import { expect } from "chai";
import { Addresser } from "../util/addresser";
import { Impersonate } from "../util/impersonator";
import { Deployment } from "../util/contractor";
import { getMoney } from "../util/money";

const tribeGovernanceInterface = new ethers.utils.Interface([
  "function proposalCount() view returns (uint256)",
  "function castVote(uint256 proposalId, uint8 support)",
  "function proposals(uint256 proposalId) view returns (uint256 id, address proposer, uint256 eta, uint256 startBlock, uint256 endBlock, uint256 forVotes, uint256 againstVotes, uint256 abstainVotes, bool canceled, bool executed)",
  "function queue(uint256 proposalId)",
  "function execute(uint256 proposalId)",
  "function propose(address[] targets, uint256[] values, bytes[] calldatas, string description) returns (uint256)",
  "function state(uint256 proposalID) view returns (uint8)",
  "event ProposalCreated(uint256 proposalId, address proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 startBlock, uint256 endBlock, string description)",
]);

const tribeTimelockInterface = new ethers.utils.Interface([
  "function admin() view returns (address a)",
  "function pendingAdmin() view returns (address a)",
]);

const tribeTokenInterface = new ethers.utils.Interface([
  "function balanceOf(address a) view returns (uint256)",
]);

const feiCoreInterface = new ethers.utils.Interface([
  "function isMinter(address a) view returns (bool)",
]);

export const execute_tribe_governance = () => {
  it("tribe should be able to successfully enable & send money to contracts & set minter", async () => {
    const imp = await Impersonate(Addresser.tribeVoterAddress);
    const signer = await ethers.getSigner(imp.address);
    await Deployment.deploy(signer);
    const governanceContract = new ethers.Contract(
      Addresser.tribeGovernorAddress,
      tribeGovernanceInterface,
      signer
    );
    const TribeToken = new ethers.Contract(
      Addresser.tribeTokenAddress,
      tribeTokenInterface,
      signer
    );
    const feiCore = new ethers.Contract(
      Addresser.feiCoreAddress,
      feiCoreInterface,
      signer
    );

    const rqnp = (Deployment.tribeRagequit?.address as string)
      .replace("0x", "")
      .toLowerCase();
    const pgnp = (Deployment.pegExchanger?.address as string)
      .replace("0x", "")
      .toLowerCase();

    const gfxnp = "0xA6E8772AF29B29B9202A073F8E36F447689BEEF6"
      .replace("0x", "")
      .toLowerCase();

    //transfer tribe - done
    //mint more tribe - done
    //set thing as a minter - done
    let proposal = governanceContract["propose"](
      [
        Addresser.feiCoreAddress,
        Addresser.tribeTokenAddress,
        Addresser.feiCoreAddress,
        Deployment.pegExchanger?.address,
        Deployment.tribeRagequit?.address,
        Addresser.feiCoreAddress,
      ],
      [0, 0, 0, 0, 0, 0],
      [
        `0xeacdd9e8000000000000000000000000${pgnp}000000000000000000000000000000000000000000ee025a008530a464ed33d9`,
        `0x40c10f19000000000000000000000000${pgnp}00000000000000000000000000000000000000000000d3c21bcecceda1000000`,
        `0x261707fa000000000000000000000000${rqnp}`,
        Deployment.pegExchanger!.interface.encodeFunctionData("party1Accept"),
        Deployment.tribeRagequit!.interface.encodeFunctionData("party1Accept"),
        `0xeacdd9e8000000000000000000000000${gfxnp}000000000000000000000000000000000000000000027B46536C66C8E3000000`,
      ],
      "mods asleep post sinks"
    ).catch(console.log);

    await expect(proposal).to.not.be.reverted;
    await fastForward(1);
    await advanceBlockHeight(1); // fast forward through review period

    let proposeEvents = await governanceContract.queryFilter(
      governanceContract.filters["ProposalCreated"]()
    );
    let proposeEvent = proposeEvents[proposeEvents.length - 1];
    let proposalNumber = proposeEvent.args!["proposalId"];
    const prep = await governanceContract.populateTransaction["castVote"](
      proposalNumber.toString(),
      "1"
    );
    await expect(signer.sendTransaction(prep)).to.not.be.reverted;

    let largeVoters = [
      "0x107d1c9ef7a2ddb6a4aecfdcd6658355c7435a43",
      "0x486c33760ad3f6d9cf4a63493773e2b69635d602",
    ];

    for (let i = 0; i < largeVoters.length; i++) {
      await signer.sendTransaction({
        to: largeVoters[i],
        value: ethers.utils.parseEther(".1"),
      });
    }

    await imp.stop();

    for (let i = 0; i < largeVoters.length; i++) {
      const voter = await Impersonate(largeVoters[i]);
      const votersigner = await ethers.getSigner(voter.address);

      const prep = governanceContract
        .connect(votersigner)
        ["castVote"](proposalNumber.toString(), "1");
      await expect(prep).to.not.be.reverted;
      await voter.stop();
    }

    imp.start();
    await advanceBlockHeight(13000); // fast forward through voting period
    await governanceContract["queue(uint256)"](proposalNumber);

    await fastForward(86400);

    await advanceBlockHeight(1); //after changing the time mine one block

    let execution = governanceContract["execute(uint256)"](proposalNumber);

    await execution.catch(console.log);

    let balanceOfDest = await TribeToken.balanceOf(
      Deployment.pegExchanger?.address
    );
    let gfxBalance = await TribeToken.balanceOf(gfxnp);

    //   expect(gfxBalance).to.hexEqual("0x27B46536C66C8E3000000");
    expect(balanceOfDest).to.be.above(0);
    expect(await feiCore.isMinter(Deployment.tribeRagequit?.address)).to.be
      .true;
  });
};

export const execute_tribe_acceptAdmin = () => {
  it("tribe should be able to successfully accept adminship", async () => {
    const imp = await Impersonate(Addresser.tribeVoterAddress);
    const signer = await ethers.getSigner(imp.address);
    const governanceContractTribe = new ethers.Contract(
      Addresser.tribeGovernorAddress,
      tribeGovernanceInterface,
      signer
    );

    const proposalToAcceptAdmin = governanceContractTribe["propose"](
      [Addresser.rgtTimelockAddress],
      [0],
      ["0x0e18b681"], // method for accept
      "mods asleep post sinks"
    ).catch(console.log);

    await expect(proposalToAcceptAdmin).to.not.be.reverted;
    await fastForward(1);
    await advanceBlockHeight(1); // fast forward through review period
    let proposeEvents = await governanceContractTribe.queryFilter(
      governanceContractTribe.filters["ProposalCreated"]()
    );

    let proposeEvent = proposeEvents[proposeEvents.length - 1];
    let proposalNumber = proposeEvent.args!["proposalId"];
    const prep = await governanceContractTribe.populateTransaction["castVote"](
      proposalNumber.toString(),
      "1"
    );
    await expect(signer.sendTransaction(prep).catch(console.log)).to.not.be
      .reverted;

    const largeVoters = [
      "0x107d1c9ef7a2ddb6a4aecfdcd6658355c7435a43",
      "0x486c33760ad3f6d9cf4a63493773e2b69635d602",
    ];

    for (let i = 0; i < largeVoters.length; i++) {
      await signer.sendTransaction({
        to: largeVoters[i],
        value: ethers.utils.parseEther(".1"),
      });
    }

    await imp.stop();
    for (let i = 0; i < largeVoters.length; i++) {
      const voter = await Impersonate(largeVoters[i]);
      const votersigner = await ethers.getSigner(voter.address);
      const prep = await governanceContractTribe
        .connect(votersigner)
        .populateTransaction["castVote"](proposalNumber.toString(), "1");
      await votersigner.sendTransaction(prep);
      await voter.stop();
    }
    await imp.start();
    await advanceBlockHeight(13000); // fast forward through voting period
    await governanceContractTribe["queue(uint256)"](proposalNumber);
    await fastForward(86400);

    await advanceBlockHeight(1); //after changing the time mine one block

    let execution = await governanceContractTribe.populateTransaction[
      "execute(uint256)"
    ](proposalNumber);
    const rariTimelock = new ethers.Contract(
      Addresser.rgtTimelockAddress,
      tribeTimelockInterface,
      signer
    );

    expect(await rariTimelock["pendingAdmin"]()).to.hexEqual(
      Addresser.tribeTimelockAddress
    );

    await expect(signer.sendTransaction(execution).catch(console.log)).to.not
      .reverted;
    expect(await rariTimelock["admin"]()).to.hexEqual(
      Addresser.tribeTimelockAddress
    );
  });
};
