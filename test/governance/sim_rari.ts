import { advanceBlockHeight, fastForward } from "../util/block";
import { ethers, network } from "hardhat";
import { expect } from "chai";
import { Addresser } from "../util/addresser";
import { Impersonate } from "../util/impersonator";
import { Deployment } from "../util/contractor";
import {
  execute_tribe_governance,
  propose_tribe_governance,
} from "./sim_tribe";

const rariGovernanceInterface = new ethers.utils.Interface([
  "function proposalCount() view returns (uint256)",
  "function castVote(uint256 proposalId, uint8 support)",
  "function proposals(uint256 proposalId) view returns (uint256 id, address proposer, uint256 eta, uint256 startBlock, uint256 endBlock, uint256 forVotes, uint256 againstVotes, uint256 abstainVotes, bool canceled, bool executed)",
  "function queue(uint256 proposalId)",
  "function execute(uint256 proposalId)",
  "function propose(address[] memory targets, uint[] memory values, string[] memory signatures, bytes[] memory calldatas, string memory description) public returns (uint256)",
]);

const rariTimelockInterface = new ethers.utils.Interface([
  "function admin() view returns (address a)",
  "function pendingAdmin() view returns (address a)",
  "function queueTransaction(address target, uint value, string memory signature, bytes memory data, uint eta) returns (bytes32)",
  "function executeTransaction(address target, uint value, string memory signature, bytes memory data, uint eta) payable returns (bytes)",
]);

export const execute_rari_governance = () => {
  it("rari governance proposal should pass", async () => {
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [Addresser.rgtVoterAddress],
    });
    const imp = await Impersonate(Addresser.rgtVoterAddress);
    let signer = await ethers.getSigner(imp.address);
    await Deployment.deploy(signer);

    const goveranceContract = new ethers.Contract(
      Addresser.rgtGovernorAddress,
      rariGovernanceInterface,
      signer
    );
    const timelockContract = new ethers.Contract(
      Addresser.rgtTimelockAddress,
      rariTimelockInterface,
      signer
    );

    let currentTimelockAdmin = await timelockContract["pendingAdmin"]();
    expect(currentTimelockAdmin).to.hexEqual("0x00");

    let contracts = [
      Addresser.rgtTimelockAddress,
      Deployment.pegExchanger?.address,
      Deployment.tribeRagequit?.address,
      "0x1FA69a416bCF8572577d3949b742fBB0a9CD98c7",
      "0x66f4856f1bbd1eb09e1c8d9d646f5a3a193da569",
      "0x59FA438cD0731EBF5F4cDCaf72D4960EFd13FCe6",
      "0x3F4931A8E9D4cdf8F56e7E8A8Cfe3BeDE0E43657",
      "0xD6e194aF3d9674b62D1b30Ec676030C23961275e",
      "0xaFD2AaDE64E6Ea690173F6DE59Fc09F5C9190d74",
      "0xB465BAF04C087Ce3ed1C266F96CA43f4847D9635",
    ];
    let values = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    let args: any = [
      ethers.utils.zeroPad(Addresser.tribeTimelockAddress, 32),
      [],
      [],

      ethers.utils.zeroPad(Addresser.tribeTimelockAddress, 32),
      ethers.utils.zeroPad(Addresser.tribeTimelockAddress, 32),
      ethers.utils.zeroPad(Addresser.tribeTimelockAddress, 32),
      ethers.utils.zeroPad(Addresser.tribeTimelockAddress, 32),
      ethers.utils.zeroPad(Addresser.tribeTimelockAddress, 32),
      ethers.utils.zeroPad(Addresser.tribeTimelockAddress, 32),
      ethers.utils.zeroPad(Addresser.tribeTimelockAddress, 32),
    ];

    let methods = [
      "setPendingAdmin(address)",
      "party0Accept()",
      "party0Accept()",
      "transferOwnership(address)",
      "transferOwnership(address)",
      "transferOwnership(address)",
      "transferOwnership(address)",
      "transferOwnership(address)",
      "transferOwnership(address)",
      "transferOwnership(address)",
    ];
    await goveranceContract["propose"](
      contracts,
      values,
      methods,
      args,
      "mods asleep post sinks"
    );

    const proposalId = await goveranceContract["proposalCount"]();

    await advanceBlockHeight(13141); // fast forward through review period

    await goveranceContract.castVote(proposalId, 1);

    let largeVoters = ["0xdbc46c788f7249251fa6b49303babcb1c519f608"];

    for (let i = 0; i < largeVoters.length; i++) {
      await signer.sendTransaction({
        to: largeVoters[i],
        value: ethers.utils.parseEther(".1"),
      });
    }

    await imp.stop();

    for (let i = 0; i < largeVoters.length; i++) {
      const voter = await Impersonate(largeVoters[i]);
      const signer = await ethers.getSigner(voter.address);
      await goveranceContract.connect(signer).castVote(proposalId, 1);
      await voter.stop();
    }

    await imp.start();

    await advanceBlockHeight(19711);

    await goveranceContract.queue(proposalId);

    await fastForward(172800);

    await advanceBlockHeight(1); //after changing the time mine one block

    await goveranceContract.execute(proposalId).catch(console.log);

    await advanceBlockHeight(1); //after changing the time mine one block

    let proposalInfo = await goveranceContract["proposals"](proposalId);

    await imp.stop();

    expect(proposalInfo["executed"]).to.be.true;
    expect(await timelockContract.pendingAdmin()).to.hexEqual(
      Addresser.tribeTimelockAddress
    );
  });
};
