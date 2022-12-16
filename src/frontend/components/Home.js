import React from "react";
import { useState } from "react";
import { ethers } from "ethers";
import { Row, Button, Form } from "react-bootstrap";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormControl from "@mui/material/FormControl";
import FormLabel from "@mui/material/FormLabel";
import TokenAbi from "../contractsData/Token.json";
import TokenAddress from "../contractsData/Token-address.json";
import GovernanceAbi from "../contractsData/MyGovernor.json";
import GovernanceAddress from "../contractsData/MyGovernor-address.json";
import { checkResultErrors } from "ethers/lib/utils";
import TreasuryAbi from "../contractsData/Treasury.json";
import TreasuryAddress from "../contractsData/Treasury-address.json";

const Home = () => {
  const [value, setValue] = useState();
  const [id, setId] = useState(null);
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  const ALCHEMY_API_KEY = "Wk2k1fN6Gv2KG4f7474ABGxpmhQrZKFM";
  const Provider = new ethers.providers.JsonRpcProvider(
    `https://polygon-mumbai.g.alchemy.com/v2/${ALCHEMY_API_KEY}`
  );
  const governance = new ethers.Contract(
    GovernanceAddress.address,
    GovernanceAbi.abi,
    signer
  );
  const token = new ethers.Contract(TokenAddress.address, TokenAbi.abi, signer);

  const DelegateVote = async () => {
    const address = await signer.getAddress();
    await (await token.delegate(address)).wait();
  };
  const Vote = async () => {
    const snapshot = await governance.proposalSnapshot(id);
    console.log(`Proposal created on block ${snapshot.toString()}`);

    const deadline = await governance.proposalDeadline(id);
    console.log(`Proposal deadline on block ${deadline.toString()}\n`);
    const blockNumber = await Provider.getBlockNumber();
    console.log(`Current blocknumber: ${blockNumber}\n`);

    // const quorum = await governance.quorum(blockNumber - 1);
    // console.log(
    //   `Number of votes required to pass: ${ethers.utils.formatEther(
    //     quorum.toString(),
    //     "ether"
    //   )}\n`
    // );
    await (await governance.castVote(id, value)).wait();
  };
  const checkResult = async () => {
    let proposalState = await governance.state(id);
    console.log(
      `Current state of proposal: ${proposalState.toString()} (Active) \n`
    );
    // NOTE: Transfer serves no purposes, it's just used to fast foward one block after the voting period ends
    // const amount = ethers.utils.parseEther("5");
    // const address = await signer.getAddress();
    // await token.transfer(address, amount);
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
    const blockNumber = await Provider.getBlockNumber();
    console.log(`Current blocknumber: ${blockNumber}\n`);

    proposalState = await governance.state(id);
    console.log(
      `Current state of proposal: ${proposalState.toString()} (Succeeded) \n`
    );

    // Queue
    const hash = ethers.utils.id("Release Funds from Treasury");
    let ABI = ["function releaseFunds()"];
    let iface = new ethers.utils.Interface(ABI);
    const encodedFunction = iface.encodeFunctionData("releaseFunds");

    await (
      await governance.queue(
        [TreasuryAddress.address],
        [0],
        [encodedFunction],
        hash
      )
    ).wait();

    proposalState = await governance.state(id);
    console.log(
      `Current state of proposal: ${proposalState.toString()} (Queued) \n`
    );

    // Execute
    await (
      await governance.execute(
        [TreasuryAddress.address],
        [0],
        [encodedFunction],
        hash,
        {}
      )
    ).wait();

    proposalState = await governance.state(id);
    console.log(
      `Current state of proposal: ${proposalState.toString()} (Executed) \n`
    );
    const treasury = new ethers.Contract(
      TreasuryAddress.address,
      TreasuryAbi.abi,
      signer
    );
    const isReleased = await treasury.isReleased();
    console.log(`Funds released? ${isReleased}`);
  };
  return (
    <div className="container-fluid mt-5">
      <div className="row">
        <main
          role="main"
          className="col-lg-3 mx-auto justifyContent-center "
          style={{ maxWidth: "1000px" }}
        >
          <div className="content mx-auto">
            <Row className="g-4">
              <FormControl>
                <FormLabel id="demo-radio-buttons-group-label">Vote</FormLabel>
                <RadioGroup
                  aria-labelledby="demo-radio-buttons-group-label"
                  defaultValue="2"
                  name="radio-buttons-group"
                >
                  <FormControlLabel
                    onChange={(e) => setValue(e.target.value)}
                    value="0"
                    control={<Radio />}
                    label="Against"
                  />
                  <FormControlLabel
                    onChange={(e) => setValue(e.target.value)}
                    value="1"
                    control={<Radio />}
                    label="For"
                  />
                  <FormControlLabel
                    onChange={(e) => setValue(e.target.value)}
                    value="2"
                    control={<Radio />}
                    label="Abstain"
                  />
                </RadioGroup>
                <Form.Control
                  onChange={(e) => setId(e.target.value)}
                  size="lg"
                  required
                  type="number"
                  placeholder="Proposal Id"
                />
              </FormControl>
              <div className="d-grid px-0">
                <Button onClick={Vote} variant="primary" size="lg">
                  Vote
                </Button>
                <br></br>
                <Button onClick={DelegateVote} variant="primary" size="lg">
                  DelegateVote
                </Button>
                <br></br>
                <Button onClick={checkResult} variant="primary" size="lg">
                  Check Result
                </Button>
              </div>
            </Row>
          </div>
        </main>
      </div>
    </div>
  );
};
export default Home;
