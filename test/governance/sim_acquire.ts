import { advanceBlockHeight, fastForward } from "../util/block";
import { ethers, network } from "hardhat";
import { expect } from "chai";
import { Addresser } from "../util/addresser";
import { Impersonate } from "../util/impersonator";
import { Deployment } from "../util/contractor";

const tribeGovernanceInterface = new ethers.utils.Interface([
  "function proposalCount() view returns (uint256)",
  "function castVote(uint256 proposalId, uint8 support)",
  "function proposals(uint256 proposalId) view returns (uint256 id, address proposer, uint256 eta, uint256 startBlock, uint256 endBlock, uint256 forVotes, uint256 againstVotes, uint256 abstainVotes, bool canceled, bool executed)",
  "function queue(uint256 proposalId)",
  "function execute(uint256 proposalId)",
  "function propose(address[] targets, uint256[] values,string[] signatures, bytes[] calldatas, string description) returns (uint256)",
  "function state(uint256 proposalID) view returns (uint8)",
  "event ProposalCreated(uint256 proposalId, address proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 startBlock, uint256 endBlock, string description)",
]);

const tribeTimelockInterface = new ethers.utils.Interface([
  "function admin() view returns (address a)",
  "function pendingAdmin() view returns (address a)",
]);

const ownableInterface = new ethers.utils.Interface([
  "function owner() view returns (address)",
  "function transferOwnership(address a)",
]);

export const execute_tribe_acquire = () => {
  it("tribe should be able to take ownership of rari contracts", async () => {
    const imp = await Impersonate(Addresser.tribeVoterAddress);
    const signer = await ethers.getSigner(imp.address);
    const governanceContractTribe = new ethers.Contract(
      Addresser.tribeGovernorAddress,
      tribeGovernanceInterface,
      signer
    );

    const proposalChangeOwnership = governanceContractTribe["propose"](
      [
        "0x1FA69a416bCF8572577d3949b742fBB0a9CD98c7",
        "0x66f4856f1bbd1eb09e1c8d9d646f5a3a193da569",
        "0x59FA438cD0731EBF5F4cDCaf72D4960EFd13FCe6",
        "0x3F4931A8E9D4cdf8F56e7E8A8Cfe3BeDE0E43657",
        "0xD6e194aF3d9674b62D1b30Ec676030C23961275e",
        "0xaFD2AaDE64E6Ea690173F6DE59Fc09F5C9190d74",
        "0xB465BAF04C087Ce3ed1C266F96CA43f4847D9635",
      ],
      [0, 0, 0, 0, 0, 0, 0],
      [
        "transferOwnership(address)",
        "transferOwnership(address)",
        "transferOwnership(address)",
        "transferOwnership(address)",
        "transferOwnership(address)",
        "transferOwnership(address)",
        "transferOwnership(address)",
      ],
      [
        `0x000000000000000000000000d51dba7a94e1adea403553a8235c302cebf41a3c`,
        `0x000000000000000000000000d51dba7a94e1adea403553a8235c302cebf41a3c`,
        `0x000000000000000000000000d51dba7a94e1adea403553a8235c302cebf41a3c`,
        `0x000000000000000000000000d51dba7a94e1adea403553a8235c302cebf41a3c`,
        `0x000000000000000000000000d51dba7a94e1adea403553a8235c302cebf41a3c`,
        `0x000000000000000000000000d51dba7a94e1adea403553a8235c302cebf41a3c`,
        `0x000000000000000000000000d51dba7a94e1adea403553a8235c302cebf41a3c`,
      ],
      "mods asleep post sinks"
    ).catch(console.log);

    await expect(proposalChangeOwnership).to.not.be.reverted;
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
    await advanceBlockHeight(19000); // fast forward through voting period
    await governanceContractTribe["queue(uint256)"](proposalNumber).catch(
      console.log
    );
    await fastForward(176400);
    await advanceBlockHeight(1); //after changing the time mine one block
    let execute = await governanceContractTribe.populateTransaction[
      "execute(uint256)"
    ](proposalNumber);

    await expect(signer.sendTransaction(execute).catch(console.log)).to.not.be
      .reverted;

    for (const shouldbe of [
      "0x1FA69a416bCF8572577d3949b742fBB0a9CD98c7",
      "0x66f4856f1bbd1eb09e1c8d9d646f5a3a193da569",
      "0x59FA438cD0731EBF5F4cDCaf72D4960EFd13FCe6",
      "0x3F4931A8E9D4cdf8F56e7E8A8Cfe3BeDE0E43657",
      "0xD6e194aF3d9674b62D1b30Ec676030C23961275e",
      "0xaFD2AaDE64E6Ea690173F6DE59Fc09F5C9190d74",
      "0xB465BAF04C087Ce3ed1C266F96CA43f4847D9635",
    ]) {
      const ownable = new ethers.Contract(shouldbe, ownableInterface, signer);
      expect(await ownable["owner"]()).to.hexEqual(
        Addresser.tribeTimelockAddress
      );
    }
  });
};
