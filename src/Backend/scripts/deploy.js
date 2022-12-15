const { ethers } = require("hardhat");

async function main() {
  const [executor] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", executor.address);
  console.log("Account balance:", (await executor.getBalance()).toString());

  //Deploy Token
  const Token = await ethers.getContractFactory("Token");
  const supply = ethers.utils.parseEther("1000");
  console.log(supply.toString());

  const token = await Token.deploy("Token", "TK", supply);
  console.log("Token contract deployed to", token.address);

  //Deploy TimeLock

  const minDelay = 0;
  const TimeLock = await ethers.getContractFactory("TimeLock");
  const timelock = await TimeLock.deploy(
    minDelay,
    [executor.address],
    [executor.address]
  );
  console.log("timelockContract", timelock.address);

  //Deploy Governance
  const Governance = await ethers.getContractFactory("MyGovernor");
  const governance = await Governance.deploy(token.address, timelock.address);
  console.log("Governance Token is deployed to", governance.address);

  //Deploy Treausry Contract
  const funds = ethers.utils.parseEther("0.01");
  const Treausry = await ethers.getContractFactory("Treasury");
  const treasury = await Treausry.deploy(executor.address, { value: funds });
  console.log("treasury contract", treasury.address);
  await treasury.transferOwnership(timelock.address);
  const owner = await treasury.owner();
  console.log("treasury", owner);

  // Save copies of each contracts abi and address to the frontend.
  saveFrontendFiles(token, "Token");
  saveFrontendFiles(timelock, "TimeLock");
  saveFrontendFiles(governance, "MyGovernor");
  saveFrontendFiles(treasury, "Treasury");
}
function saveFrontendFiles(contract, name) {
  const fs = require("fs");
  const contractsDir = __dirname + "/../../frontend/contractsData";

  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir);
  }

  fs.writeFileSync(
    contractsDir + `/${name}-address.json`,
    JSON.stringify({ address: contract.address }, undefined, 2)
  );

  const contractArtifact = artifacts.readArtifactSync(name);

  fs.writeFileSync(
    contractsDir + `/${name}.json`,
    JSON.stringify(contractArtifact, null, 2)
  );
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
