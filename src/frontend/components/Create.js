import React, { useState } from "react";
import { ethers } from "ethers";
import TokenAbi from "../contractsData/Token.json";
import TokenAddress from "../contractsData/Token-address.json";
import TimeLockAddress from "../contractsData/TimeLock-address.json";
import TimeLockAbi from "../contractsData/TimeLock.json";
import GovernanceAbi from "../contractsData/MyGovernor.json";
import GovernanceAddress from "../contractsData/MyGovernor-address.json";
import TreasuryAbi from "../contractsData/Treasury.json";
import TreasuryAddress from "../contractsData/Treasury-address.json";
import { Row, Form, Button } from "react-bootstrap";
const Create = () => {
  const [address, setAddress] = useState("");
  const [amount, setAmount] = useState(null);
  const [description, setDescription] = useState("");
  console.log(description);
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  const transferToken = async () => {
    const token = new ethers.Contract(
      TokenAddress.address,
      TokenAbi.abi,
      signer
    );
    const funds = ethers.utils.parseEther(amount);
    console.log(funds.toString());
    await (await token.transfer(address, funds)).wait();
  };
  const GrantRole = async () => {
    const timelock = new ethers.Contract(
      TimeLockAddress.address,
      TimeLockAbi.abi,
      signer
    );
    const governance = new ethers.Contract(
      GovernanceAddress.address,
      GovernanceAbi.abi,
      signer
    );
    const proposerRole = await timelock.PROPOSER_ROLE();
    const executorRole = await timelock.EXECUTOR_ROLE();
    await (await timelock.grantRole(proposerRole, governance.address)).wait();
    await (await timelock.grantRole(executorRole, governance.address)).wait();
  };

  const Proposal = async () => {
    const governance = new ethers.Contract(
      GovernanceAddress.address,
      GovernanceAbi.abi,
      signer
    );
    let ABI = ["function releaseFunds()"];
    let iface = new ethers.utils.Interface(ABI);
    const encodedFunction = iface.encodeFunctionData("releaseFunds");
    console.log(encodedFunction);

    const tx = await (
      await governance.propose(
        [TreasuryAddress.address],
        [0],
        [encodedFunction],
        "Release Funds from Treasury"
      )
    ).wait();
    const id = tx.events[0].args.proposalId;

    console.log(`Created Proposal: ${id.toString()}\n`);
    const proposalState = await governance.state(id);
    console.log(
      `Current state of proposal: ${proposalState.toString()} (Pending) \n`
    );
    const snapshot = await governance.proposalSnapshot(id);
    console.log(`Proposal created on block ${snapshot.toString()}`);
  };

  return (
    <div className="container-fluid mt-5">
      <div className="row">
        <main
          role="main"
          className="col-lg-5 mx-auto"
          style={{ maxWidth: "1000px" }}
        >
          <div className="content mx-auto">
            <Row className="g-2">
              <Form.Control
                onChange={(e) => setAddress(e.target.value)}
                size="lg"
                required
                type="address"
                placeholder="Address"
              />
              <Form.Control
                onChange={(e) => setAmount(e.target.value)}
                size="lg"
                required
                type="number"
                placeholder="Amount to Transfer"
              />
              <div className="d-grid px-0">
                <Button onClick={transferToken} variant="primary" size="lg">
                  Transfer Token
                </Button>
                <br></br>
                <Button onClick={GrantRole} variant="primary" size="lg">
                  Grant Role
                </Button>
              </div>
            </Row>
          </div>
        </main>
        <main
          role="main"
          className="col-lg-5 mx-auto"
          style={{ maxWidth: "1000px" }}
        >
          <div className="content mx-auto">
            <Row className="g-2">
              <Form.Control
                onChange={(e) => setDescription(e.target.value)}
                size="lg"
                required
                type="text"
                placeholder="Description"
              />
              <div className="d-grid px-0">
                <Button onClick={Proposal} variant="primary" size="lg">
                  Proposal
                </Button>
              </div>
            </Row>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Create;
