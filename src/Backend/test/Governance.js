const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { ethers } = require("hardhat");
describe("Treasury", function () {
  it("Should transfer the ownership of Treasury to TimeLock", async function () {
    const [owner] = await ethers.getSigners();
    console.log(owner.address);
    const Timelock = await ethers.getContractFactory("TimeLock");
    const Treasury = await ethers.getContractFactory("Treasury");
    const minDelay = 0;
    const address = await owner.address;
    const timelock = await Timelock.deploy(minDelay, [address], [address]);
    const treasury = await Treasury.deploy(address);
    await treasury.transferOwnership(timelock.address);
    console.log(timelock.address);
    expect(await treasury.owner()).to.equal(timelock.address);
  });
  // it("Release Funds could only be called by timeLock Address", async function () {
  //   const [owner] = await ethers.getSigners();
  //   const Timelock = await ethers.getContractFactory("TimeLock");
  //   const Treasury = await ethers.getContractFactory("Treasury");
  //   const minDelay = 0;
  //   const address = await owner.address;
  //   const timelock = await Timelock.deploy(minDelay, [address], [address]);
  //   const treasury = await Treasury.deploy(address);
  //   await treasury.transferOwnership(timelock.address);
  //   await expect(treasury.connect(owner).releaseFunds()).to.be.revertedWith(
  //     "Ownable: caller is not the owner"
  //   );
  // });
  it("Should return True When funds are released", async function () {
    const [owner] = await ethers.getSigners();
    const Treasury = await ethers.getContractFactory("Treasury");
    const address = await owner.address;
    const funds = ethers.utils.parseEther("1");
    const treasury = await Treasury.deploy(address, { value: funds });
    await treasury.releaseFunds();
    const isReleased = await treasury.isReleased();
    await expect(isReleased).to.equal(true);
  });
  it("Should return false when funds are not Released", async function () {
    const [owner] = await ethers.getSigners();
    const Treasury = await ethers.getContractFactory("Treasury");
    const address = await owner.address;
    const funds = ethers.utils.parseEther("1");
    const treasury = await Treasury.deploy(address, { value: funds });
    const isReleased = await treasury.isReleased();
    await expect(isReleased).to.equal(false);
  });
});
describe("Governance", function () {
  it("propose,votes,waits,queues,and then executes", async function () {
    //Grant Role
    const [owner, addr1, addr2, addr3, addr4] = await ethers.getSigners();
    const address = await owner.address;
    const Governance = await ethers.getContractFactory("MyGovernor");
    const TimeLock = await ethers.getContractFactory("TimeLock");
    const Token = await ethers.getContractFactory("Token");
    const Treasury = await ethers.getContractFactory("Treasury");

    const minDelay = 0;
    const timelock = await TimeLock.deploy(minDelay, [address], [address]);
    const supply = ethers.utils.parseEther("1000");
    const token = await Token.deploy("MT", "M", supply);
    const funds = ethers.utils.parseEther("50");
    await (await token.transfer(addr1.address, funds)).wait();
    await (await token.transfer(addr2.address, funds)).wait();
    await (await token.transfer(addr3.address, funds)).wait();
    await (await token.transfer(addr4.address, funds)).wait();
    const governance = await Governance.deploy(token.address, timelock.address);
    const treasury = await Treasury.deploy(address);
    await treasury.transferOwnership(timelock.address);
    const proposerRole = await timelock.PROPOSER_ROLE();
    const executorRole = await timelock.EXECUTOR_ROLE();
    await (await timelock.grantRole(proposerRole, governance.address)).wait();
    await (await timelock.grantRole(executorRole, governance.address)).wait();

    await (await token.delegate(owner.address)).wait();
    await (await token.connect(addr1).delegate(addr1.address)).wait();
    await (await token.connect(addr2).delegate(addr2.address)).wait();
    await (await token.connect(addr3).delegate(addr3.address)).wait();
    await (await token.connect(addr4).delegate(addr4.address)).wait();
    // // propose
    let ABI = ["function releaseFunds()"];
    let iface = new ethers.utils.Interface(ABI);
    const encodedFunction = iface.encodeFunctionData("releaseFunds");
    console.log(encodedFunction);
    const string = "Release Funds from Treasury";
    const tx = await (
      await governance.propose(
        [treasury.address],
        [0],
        [encodedFunction],
        string
      )
    ).wait();
    const id = tx.events[0].args.proposalId;
    console.log(id);

    let proposalState = await governance.state(id);
    console.log(`Current Proposal State: ${proposalState}`);

    // vote
    await governance.castVote(id, 1);
    await governance.connect(addr1).castVote(id, 1);
    await governance.connect(addr2).castVote(id, 1);
    await governance.connect(addr3).castVote(id, 1);
    await governance.connect(addr4).castVote(id, 1);
    const amount = ethers.utils.parseEther("5");
    await token.connect(owner).transfer(addr1.address, amount);
    const votes = await governance.proposalVotes(id);
    console.log(votes);
    const { againstVotes, forVotes, abstainVotes } =
      await governance.proposalVotes(id);
    console.log(
      `Votes For: ${ethers.utils.formatEther(forVotes.toString(), "ether")}`
    );
    console.log(
      `Votes Against: ${ethers.utils.formatEther(
        againstVotes.toString(),
        "ether"
      )}`
    );
    console.log(
      `Votes Neutral: ${ethers.utils.formatEther(
        abstainVotes.toString(),
        "ether"
      )}\n`
    );
    proposalState = await governance.state(id);
    console.log(`Current Proposal State: ${proposalState}`);
    const hash = ethers.utils.id("Release Funds from Treasury");
    await governance.queue([treasury.address], [0], [encodedFunction], hash);

    proposalState = await governance.state(id);
    console.log(`Current Proposal State: ${proposalState}`);

    console.log("Executing...");
    await governance.execute([treasury.address], [0], [encodedFunction], hash);
    const isReleased = await treasury.isReleased();
    console.log(`Funds released? ${isReleased}`);
  });
});
