import { advanceBlockHeight, fastForward } from "../util/block";
import { ethers, network } from "hardhat";
import { expect } from "chai";
import { Addresser } from "../util/addresser";
import { Impersonate } from "../util/impersonator";
import { Deployment } from "../util/contractor";

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
    await goveranceContract["propose"](
      [
        Addresser.rgtTimelockAddress,
        Deployment.pegExchanger?.address,
        Deployment.tribeRagequit?.address,
      ],
      [0, 0, 0],
      ["setPendingAdmin(address)", "party0Accept()", "party0Accept()"],
      [ethers.utils.zeroPad(Addresser.tribeTimelockAddress, 32), [], []],
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

    let proposalInfo = await goveranceContract["proposals"](proposalId);

    await imp.stop();

    expect(proposalInfo["executed"]).to.be.true;
    expect(await timelockContract.pendingAdmin()).to.hexEqual(
      Addresser.tribeTimelockAddress
    );
  });
};
