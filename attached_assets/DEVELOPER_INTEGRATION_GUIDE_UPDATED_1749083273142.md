# Verify hook is active
ls -la .husky/pre-commit
# -rwxr-xr-x  1 user  staff  321 Apr 21 14:21 .husky/pre-commit# D-Loop Protocol Developer Integration Guide

This guide provides essential information for developers integrating with the D-Loop Protocol deployed on the Sepolia testnet.

## Environment Variables

Create a `.env` file in the project root and set:
```bash
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/nZm3gvuzZscBnLktmxR0VRz6kvAK4NRqtXEMZKS9EsqjMkNis3vPgA
PRIVATE_KEY=YOUR_PRIVATE_KEY          # prefix with 0x
DEPLOYER_PRIVATE_KEY=YOUR_PRIVATE_KEY
ETHERSCAN_API_KEY=HG7DAYXKN5B6AZE35WRDVQRSNN5IDC3ZG6

# Chainlink feed configuration
CHAINLINK_AGGREGATOR_ADDRESS=0xA2F78ab2355fe2f984D808B5CeE7FD0A93D5270E
CHAINLINK_MAX_STALENESS=86400          # seconds before price is stale
CHAINLINK_HEARTBEAT=3600               # expected update interval
CHAINLINK_RELIABILITY_SCORE=90         # 0-100 scale
```

---

## ABI Compatibility & Public Getters
- All contract addresses, roles, and key variables referenced in integration scripts or tests must be declared as `public` variables or have explicit public getter functions in the Solidity contracts.
- If you encounter errors such as `contracts.<ContractName>.<member> is not a function`, verify that the member is declared `public` and is present in the ABI. If not, update the contract and redeploy.
- After modifying contract interfaces, always recompile contracts and update ABIs in your integration code.

## Deployment & Integration Updates
- Ensure a `.env` file uses the provided Infura and Etherscan credentials (see Environment Variables above).
- For a dry run against a local network, start a Hardhat node (`npx hardhat node`) and run:
  ```bash
  npx hardhat run scripts/deployment/deploy-sepolia-v6.js --network localhost
  ```
- To deploy to Sepolia (Phase 1), run:
  ```bash
  npx hardhat run scripts/deployment/deploy-sepolia-v6.js --network sepolia
  ```
- To deploy Phase 2 contracts, run:
  ```bash
  npx hardhat run scripts/deployment/deploy-phase2.js --network sepolia
  npx hardhat run scripts/deployment/phase2-post-deployment.js --network sepolia
  ```
- When new public variables are added to contracts (e.g., `nodeRegistry`, `governanceToken`, `protocolDAO`), update deployment scripts and integration code to supply the correct constructor arguments.
- Review all deployment scripts and ensure all required parameters are passed during contract deployment.
- The deployment scripts now use a robust dependency resolution approach: contracts are deployed in passes, and each contract is only deployed once all its dependencies are available. This ensures all constructor arguments are valid addresses and avoids deployment failures due to unresolved dependencies.

### Smoke Tests

Run smoke tests to validate the on-chain deployment:
```bash
npx hardhat run scripts/testing/smoke-sepolia.js --network sepolia
```

## Network Requirements for Verification
- Some scripts (e.g., verification scripts) must be run on the Sepolia testnet. They will not execute correctly on a local Hardhat network.
- Example:
  ```bash
  npx hardhat run scripts/deployment/verify-sepolina-deployment.js --network sepolia
  ```

---

## Contract Addresses

The following contracts have been deployed to the Sepolia testnet (as of 2025-04-27 Phase 4 deployment):

| Contract               | Address                                      | Etherscan Link                                                                                                     |
|------------------------|----------------------------------------------|--------------------------------------------------------------------------------------------------------------------|
| SoulboundNFT           | `0x6391C14631b2Be5374297fA3110687b80233104c` | [View](https://sepolia.etherscan.io/address/0x6391C14631b2Be5374297fA3110687b80233104c#code)                |
| DLoopToken             | `0x05B366778566e93abfB8e4A9B794e4ad006446b4` | [View](https://sepolia.etherscan.io/address/0x05B366778566e93abfB8e4A9B794e4ad006446b4#code)                |
| ProtocolDAO            | `0x012e4042ab5F55A556a8B453aBeC852D9466aFb0` | [View](https://sepolia.etherscan.io/address/0x012e4042ab5F55A556a8B453aBeC852D9466aFb0#code)                |
| Treasury               | `0x476aAF510540F4c755cCe7E0FAaC7560b5D711F4` | [View](https://sepolia.etherscan.io/address/0x476aAF510540F4c755cCe7E0FAaC7560b5D711F4#code)                |
| AINodeRegistry         | `0x0045c7D99489f1d8A5900243956B0206344417DD` | [View](https://sepolia.etherscan.io/address/0x0045c7D99489f1d8A5900243956B0206344417DD#code)                |
| PriceOracle            | `0x3D3aEA9D8ad748398a55bf0f7f9832498758f92a` | [View](https://sepolia.etherscan.io/address/0x3D3aEA9D8ad748398a55bf0f7f9832498758f92a#code)                |
| GovernanceRewards      | `0x295e6f4644AcC2b0bB762bBE1bba86F08D8b85f2` | [View](https://sepolia.etherscan.io/address/0x295e6f4644AcC2b0bB762bBE1bba86F08D8b85f2#code)                |
| AssetDAO               | `0xa87e662061237a121Ca2E83E77dA8251bc4B3529` | [View](https://sepolia.etherscan.io/address/0xa87e662061237a121Ca2E83E77dA8251bc4B3529#code)                |
| ChainlinkPriceOracle   | `0xa1A0B6F1a771faBe3a3963b922bf6ea1D4F7bb1b` | [View](https://sepolia.etherscan.io/address/0xa1A0B6F1a771faBe3a3963b922bf6ea1D4F7bb1b#code)                |
| AINodeGovernance       | `0x28fe6eA0D91D5Ca8C080E727cdEb02B2B740f458` | [View](https://sepolia.etherscan.io/address/0x28fe6eA0D91D5Ca8C080E727cdEb02B2B740f458#code)                |
| FeeCalculator          | `0x0EB08c64dB39286680B89B548e7A545708F48adf` | [View](https://sepolia.etherscan.io/address/0x0EB08c64dB39286680B89B548e7A545708F48adf#code)                |
| FeeProcessor           | `0x96664603DDFB16DfaF3Ea329216Dd461AcfEffaA` | [View](https://sepolia.etherscan.io/address/0x96664603DDFB16DfaF3Ea329216Dd461AcfEffaA#code)                |
| PriceOracleAdapter     | `0x680b8aec7012a2F70be0a131579e851A5114Db50` | [View](https://sepolia.etherscan.io/address/0x680b8aec7012a2F70be0a131579e851A5114Db50#code)                |
| SoulboundNFTAdapter    | `0xA114f53B7Ad1c21b8808C54790cDC0221F8496B2` | [View](https://sepolia.etherscan.io/address/0xA114f53B7Ad1c21b8808C54790cDC0221F8496B2#code)                |
| SimplifiedAdminControls| `0x8ecA689EbcD3f7FEE94043AD145E15b3736486c6` | [View](https://sepolia.etherscan.io/address/0x8ecA689EbcD3f7FEE94043AD145E15b3736486c6#code)                |
| TokenApprovalOptimizer | `0x603aa2e89A2c356bFA0220ECCcBA0168a9220C28` | [View](https://sepolia.etherscan.io/address/0x603aa2e89A2c356bFA0220ECCcBA0168a9220C28#code)                |
| TokenOptimizer         | `0x564ef9D80e883fEF98ae248580C6f167Eb725A62` | [View](https://sepolia.etherscan.io/address/0x564ef9D80e883fEF98ae248580C6f167Eb725A62#code)                |

## Contract Relationships

The D-Loop Protocol contracts are interconnected as follows:

1. **ProtocolDAO**: Central governance contract that manages protocol parameters and upgrades
2. **Treasury**: Manages protocol funds and token distributions
3. **DLoopToken**: ERC20 token for the protocol with delegation capabilities
4. **AINodeRegistry**: Manages AI node registration and verification
5. **SoulboundNFT**: Non-transferable NFT for identity verification
6. **GovernanceRewards**: Distributes rewards for governance participation
7. **PriceOracle**: Provides price data for protocol operations

**Phase 2 (Planned):**
- AssetDAO: Digital asset management
- AINodeGovernance: Specialized AI node governance
- FeeCalculator, FeeProcessor, PriceOracleAdapter, ChainlinkPriceOracle, SoulboundNFTAdapter, SimplifiedAdminControls, TokenApprovalOptimizer, TokenOptimizer

## Integration Examples

### Accessing New Public Members

Many contracts now expose key addresses and roles as public variables for integration and verification. Example:

```javascript
// GovernanceRewards public getters
const governanceRewardsAbi = [
  "function governanceToken() view returns (address)",
  "function protocolDAO() view returns (address)"
];

const governanceRewards = new ethers.Contract(
  '0xA414c337ce5a41d65cFB0D961Aa97e3C3AE56149',
  governanceRewardsAbi,
  provider
);

// Example: Get the governance token address
const governanceTokenAddress = await governanceRewards.governanceToken();

// AINodeRegistry ADMIN_ROLE (constant)
const aiNodeRegistryAbi = [
  "function ADMIN_ROLE() view returns (bytes32)"
];
const aiNodeRegistry = new ethers.Contract(
  '0xbe347ed17F07304B0840Ca93facC12865C4f3c78',
  aiNodeRegistryAbi,
  provider
);
const adminRole = await aiNodeRegistry.ADMIN_ROLE();
```

### Contract Verification Automation

After each deployment, you can automatically verify all contracts on Etherscan using:

```bash
npm run postdeploy
```
This will verify all contracts in the latest deployment file for Sepolia.

To verify a specific deployment file (e.g., for a custom or previous deployment), run:

```bash
DEPLOYMENT_FILE=sepolia-phase2-deployment-2025-04-22T00-44-25.172Z.json npm run postdeploy
```

The verification script will skip any contracts without an address in the deployment file.

### Preparing for Phase 2

Phase 2 will introduce new contracts and interfaces. To prepare:
- Review the new deployment scripts: `deploy-phase2.js`, `phase2-dry-run.js`
- Ensure your integration scripts can resolve contract addresses dynamically from the deployments folder
- Watch for new ABIs and contract addresses in the next deployment round

### Fetching Asset Prices

```javascript
const { ethers } = require('ethers');
const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);

const oracleAddress = '0xa1A0B6F1a771faBe3a3963b922bf6ea1D4F7bb1b';
const oracleAbi = [
  'function supportsAsset(address) view returns (bool)',
  'function getAssetPrice(address) view returns (uint256)'
];
const oracle = new ethers.Contract(oracleAddress, oracleAbi, provider);

const tokenAddress = '0x05B366778566e93abfB8e4A9B794e4ad006446b4'; // DLoopToken
(async () => {
  const supported = await oracle.supportsAsset(tokenAddress);
  if (!supported) {
    console.error('Token not supported by oracle');
    return;
  }
  const rawPrice = await oracle.getAssetPrice(tokenAddress);
  console.log(`Price: ${ethers.formatUnits(rawPrice, 18)} USD`);
})();
```

### Connecting to the DLoopToken

```javascript
const { ethers } = require('ethers');

// Connect to Sepolia
const provider = new ethers.JsonRpcProvider('https://sepolia.infura.io/v3/YOUR_INFURA_KEY');

// DLoopToken ABI (minimal version for basic interactions)
const dloopTokenAbi = [
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function delegateTokens(address delegatee, uint256 amount) external",
  "function undelegateTokens(address delegatee, uint256 amount) external",
  "function getDelegatedAmount(address delegator, address delegatee) external view returns (uint256)"
];

// Connect to DLoopToken
const dloopTokenAddress = '0x200B3d7ef1cbf134A3c89ca972CFFF9032E3FAa2';
const dloopToken = new ethers.Contract(dloopTokenAddress, dloopTokenAbi, provider);

// With a signer
const wallet = new ethers.Wallet('YOUR_PRIVATE_KEY', provider);
const dloopTokenWithSigner = dloopToken.connect(wallet);

// Example: Check balance
async function checkBalance(address) {
  const balance = await dloopToken.balanceOf(address);
  console.log(`Balance: ${ethers.formatEther(balance)} DLOOP`);
}

// Example: Delegate tokens
async function delegateTokens(delegatee, amount) {
  const tx = await dloopTokenWithSigner.delegateTokens(delegatee, ethers.parseEther(amount));
  await tx.wait();
  console.log(`Successfully delegated ${amount} DLOOP to ${delegatee}`);
}
```

### Interacting with the ProtocolDAO

```javascript
const { ethers } = require('ethers');

// Connect to Sepolia
const provider = new ethers.JsonRpcProvider('https://sepolia.infura.io/v3/YOUR_INFURA_KEY');

// ProtocolDAO ABI (minimal version for basic interactions)
const protocolDAOAbi = [
  "function createProposal(string memory description, address[] memory targets, uint256[] memory values, bytes[] memory calldatas) external returns (uint256)",
  "function castVote(uint256 proposalId, bool support) external",
  "function executeProposal(uint256 proposalId) external",
  "function nodeRegistry() view returns (address)", // New public getter
  "function proposals(uint256) view returns (uint256 id, string description, address proposer, uint256 createdAt, uint256 votingEnds, uint256 forVotes, uint256 againstVotes, bool executed, bool canceled)"
];

// Connect to ProtocolDAO
const protocolDAOAddress = '0x43918C79b25f33c22967D5CEE52Daa20353C1dcd';
const protocolDAO = new ethers.Contract(protocolDAOAddress, protocolDAOAbi, provider);

// With a signer
const wallet = new ethers.Wallet('YOUR_PRIVATE_KEY', provider);
const protocolDAOWithSigner = protocolDAO.connect(wallet);

// Example: Create a proposal
async function createProposal(description, target, value, calldata) {
  const tx = await protocolDAOWithSigner.createProposal(
    description,
    [target],
    [value],
    [calldata]
  );
  const receipt = await tx.wait();
  console.log(`Proposal created with transaction hash: ${receipt.hash}`);
}

// Example: Vote on a proposal
async function voteOnProposal(proposalId, support) {
  const tx = await protocolDAOWithSigner.castVote(proposalId, support);
  await tx.wait();
  console.log(`Vote cast on proposal ${proposalId}`);
}

## RageQuit Integration

### 1. Introduction to RageQuit
RageQuit is a safety mechanism in the D-Loop Protocol that allows users to exit their positions and reclaim locked DLOOP tokens under certain conditions (e.g., governance disputes or emergency exit). This feature emits a `RageQuitExecuted` event and returns the user’s tokens.

### 2. Prerequisites
- A Web3 provider (e.g., ethers.js) connected to Sepolia.
- A signer (e.g., MetaMask or private key) with sufficient permissions.
- Contract addresses and ABIs for `ProtocolDAO` and `DLoopToken` from `src/config/contracts.ts`.

### 3. Integration Steps
1. **Import and initialize contracts**:
```javascript
import { contracts } from '../src/config/contracts';
const { ProtocolDAO, DLoopToken } = contracts;
const dao = new ethers.Contract(ProtocolDAO.address, ProtocolDAO.abi, signer);
const token = new ethers.Contract(DLoopToken.address, DLoopToken.abi, signer);
```
2. **Call the `rageQuit` function**:
```javascript
const tx = await dao.rageQuit(userAddress);
await tx.wait();
console.log('RageQuit transaction confirmed');
```
3. **Verify token return**:
```javascript
const balance = await token.balanceOf(userAddress);
console.log(`Balance after RageQuit: ${ethers.formatEther(balance)} DLOOP`);
```

### 4. Example Code Snippet
```javascript
async function performRageQuit(signer, userAddress) {
  const { ProtocolDAO, DLoopToken } = contracts;
  const dao = new ethers.Contract(ProtocolDAO.address, ProtocolDAO.abi, signer);
  const token = new ethers.Contract(DLoopToken.address, DLoopToken.abi, signer);

  console.log('Initiating RageQuit...');
  const tx = await dao.rageQuit(userAddress);
  await tx.wait();
  console.log('RageQuit complete');

  const newBalance = await token.balanceOf(userAddress);
  console.log(`New balance: ${ethers.formatEther(newBalance)} DLOOP`);
}

## AssetDAO Governance Integration

The AssetDAO contract handles proposal creation, voting, and execution for digital asset management within the D-Loop ecosystem. This section provides comprehensive guidance for integrating with these governance functions using Ethers v6.

### 1. Proposal Types and States

The AssetDAO contract supports multiple proposal types and states:

```javascript
// Proposal Types
const ProposalType = {
  Investment: 0,     // Invest tokens into the DAO (receive tokens)
  Divestment: 1,     // Divest tokens from the DAO (send tokens)
  ParameterChange: 2, // Change governance parameters
  Other: 3           // Other proposal types
};

// Proposal States
const ProposalState = {
  Pending: 0,   // Proposal created but voting hasn't started
  Active: 1,    // Voting is active
  Succeeded: 2, // Passed but not executed
  Defeated: 3,  // Failed due to voting results
  Executed: 4,  // Successfully executed
  Canceled: 5,  // Canceled by admin or proposer
  Expired: 6    // Passed but execution time window expired
};
```

### 2. Proposal Creation and Retrieval

#### Creating a New Proposal

```javascript
const { ethers } = require('ethers');

// Connect to Sepolia
const provider = new ethers.JsonRpcProvider('https://sepolia.infura.io/v3/YOUR_INFURA_KEY');
const wallet = new ethers.Wallet('YOUR_PRIVATE_KEY', provider);

// AssetDAO ABI (minimal version for proposal creation)
const assetDAOAbi = [
  "function propose(uint8 proposalType, address token, uint256 amount, string memory description) external returns (uint256)",
  "function getProposal(uint256 proposalId) external view returns (uint256 id, uint8 proposalType, address token, uint256 amount, address proposer, uint256 createdAt, uint256 votingEnds, uint256 forVotes, uint256 againstVotes, uint8 state)",
  "function getProposalDescription(uint256 proposalId) external view returns (string memory)"
];

// Connect to AssetDAO
const assetDAOAddress = '0xa87e662061237a121Ca2E83E77dA8251bc4B3529';
const assetDAO = new ethers.Contract(assetDAOAddress, assetDAOAbi, wallet);

// Example: Create an investment proposal
async function createInvestmentProposal(tokenAddress, amount, description) {
  // Ensure proper formatting of the amount based on token decimals
  const token = new ethers.Contract(tokenAddress, [
    "function decimals() view returns (uint8)"
  ], provider);
  const decimals = await token.decimals();
  const formattedAmount = ethers.parseUnits(amount.toString(), decimals);
  
  // Create proposal
  try {
    const tx = await assetDAO.propose(
      ProposalType.Investment,
      tokenAddress,
      formattedAmount,
      description
    );
    
    console.log(`Transaction hash: ${tx.hash}`);
    const receipt = await tx.wait();
    
    // Extract proposal ID from the event logs
    const interface = new ethers.Interface([
      "event ProposalCreated(uint256 indexed proposalId, uint256 assetId, address indexed proposer, uint8 proposalType)"
    ]);
    
    const proposalCreatedLog = receipt.logs
      .map(log => { try { return interface.parseLog(log); } catch (e) { return null; }})
      .filter(log => log && log.name === 'ProposalCreated')[0];
    
    if (proposalCreatedLog) {
      const proposalId = proposalCreatedLog.args.proposalId;
      console.log(`Proposal created with ID: ${proposalId}`);
      return proposalId;
    }
    
    console.log('Proposal created but ID not found in logs');
    return null;
  } catch (error) {
    console.error('Error creating proposal:', error);
    throw error;
  }
}

// Example usage
createInvestmentProposal(
  '0x1c7d4b196cb0c7b01d743fbc6116a902379c7238', // USDC token address
  '1',  // Amount (1 USDC)
  'Invest in USDC\n\nI propose to invest 1 USDC into the DAO treasury.\n\nThis allocation to USDC will strengthen our stable asset reserves, providing better liquidity options for future investments and reducing portfolio volatility.'
);
```

#### Retrieving Proposal Details

```javascript
async function getProposalDetails(proposalId) {
  try {
    // Get main proposal data
    const proposal = await assetDAO.getProposal(proposalId);
    
    // Get proposal description (separate call for gas optimization)
    const description = await assetDAO.getProposalDescription(proposalId);
    
    // Format the proposal object for better readability
    const formattedProposal = {
      id: proposal.id,
      type: getProposalTypeName(proposal.proposalType),
      token: proposal.token,
      amount: proposal.amount,
      proposer: proposal.proposer,
      createdAt: new Date(Number(proposal.createdAt) * 1000).toISOString(),
      votingEnds: new Date(Number(proposal.votingEnds) * 1000).toISOString(),
      forVotes: ethers.formatEther(proposal.forVotes), // Assuming DLOOP tokens for voting
      againstVotes: ethers.formatEther(proposal.againstVotes),
      state: getProposalStateName(proposal.state),
      description: description
    };
    
    console.log('Proposal details:', formattedProposal);
    return formattedProposal;
  } catch (error) {
    console.error('Error retrieving proposal:', error);
    throw error;
  }
}

// Helper functions for enum conversion
function getProposalTypeName(typeId) {
  const types = ['Investment', 'Divestment', 'ParameterChange', 'Other'];
  return types[typeId] || 'Unknown';
}

function getProposalStateName(stateId) {
  const states = ['Pending', 'Active', 'Succeeded', 'Defeated', 'Executed', 'Canceled', 'Expired'];
  return states[stateId] || 'Unknown';
}
```

#### Listing All Proposals

```javascript
async function getAllProposals() {
  try {
    // Get proposal count
    const proposalCount = await assetDAO.getProposalCount();
    console.log(`Total proposals: ${proposalCount}`);
    
    // Fetch all proposals
    const proposals = [];
    for (let i = 1; i <= proposalCount; i++) {
      const proposal = await getProposalDetails(i);
      proposals.push(proposal);
    }
    
    return proposals;
  } catch (error) {
    console.error('Error retrieving all proposals:', error);
    throw error;
  }
}
```

### 3. Proposal Voting

```javascript
// AssetDAO voting ABI
const votingAbi = [
  "function vote(uint256 proposalId, bool support) external",
  "function hasVoted(uint256 proposalId, address voter) external view returns (bool)",
  "function getVoterSupport(uint256 proposalId, address voter) external view returns (bool)",
  "function getVoteWeight(uint256 proposalId, address voter) external view returns (uint256)"
];

const assetDAOVoting = new ethers.Contract(assetDAOAddress, votingAbi, wallet);

// Vote on a proposal
async function voteOnProposal(proposalId, support) {
  try {
    // Check if already voted
    const hasVoted = await assetDAOVoting.hasVoted(proposalId, wallet.address);
    if (hasVoted) {
      console.log(`You have already voted on proposal ${proposalId}`);
      const voterSupport = await assetDAOVoting.getVoterSupport(proposalId, wallet.address);
      console.log(`Your vote: ${voterSupport ? 'For' : 'Against'}`);
      return;
    }
    
    // Cast vote
    const tx = await assetDAOVoting.vote(proposalId, support);
    console.log(`Vote transaction hash: ${tx.hash}`);
    
    const receipt = await tx.wait();
    
    // Look for VoteCast event
    const interface = new ethers.Interface([
      "event VoteCast(uint256 indexed proposalId, address indexed voter, bool support, uint256 weight)"
    ]);
    
    const voteCastLog = receipt.logs
      .map(log => { try { return interface.parseLog(log); } catch (e) { return null; }})
      .filter(log => log && log.name === 'VoteCast')[0];
    
    if (voteCastLog) {
      const weight = voteCastLog.args.weight;
      console.log(`Vote cast successfully with weight: ${ethers.formatEther(weight)} DLOOP`);
    } else {
      console.log('Vote cast successfully');
    }
  } catch (error) {
    console.error('Error voting on proposal:', error);
    throw error;
  }
}

// Get voting summary for a proposal
async function getVotingSummary(proposalId) {
  try {
    const proposal = await assetDAO.getProposal(proposalId);
    
    // Calculate percentages
    const totalVotes = Number(proposal.forVotes) + Number(proposal.againstVotes);
    const forPercentage = totalVotes > 0 ? (Number(proposal.forVotes) / totalVotes) * 100 : 0;
    const againstPercentage = totalVotes > 0 ? (Number(proposal.againstVotes) / totalVotes) * 100 : 0;
    
    return {
      forVotes: ethers.formatEther(proposal.forVotes),
      againstVotes: ethers.formatEther(proposal.againstVotes),
      totalVotes: ethers.formatEther(BigInt(totalVotes)),
      forPercentage: forPercentage.toFixed(2) + '%',
      againstPercentage: againstPercentage.toFixed(2) + '%',
      state: getProposalStateName(proposal.state)
    };
  } catch (error) {
    console.error('Error getting voting summary:', error);
    throw error;
  }
}
```

### 4. Proposal Execution

```javascript
// AssetDAO execution ABI
const executionAbi = [
  "function executeProposal(uint256 proposalId) external",
  "function cancelProposal(uint256 proposalId) external",
  "function canBeExecuted(uint256 proposalId) external view returns (bool)"
];

const assetDAOExecution = new ethers.Contract(assetDAOAddress, executionAbi, wallet);

// Execute a proposal
async function executeProposal(proposalId) {
  try {
    // Check if the proposal can be executed
    const canExecute = await assetDAOExecution.canBeExecuted(proposalId);
    if (!canExecute) {
      console.log(`Proposal ${proposalId} cannot be executed yet`);
      const proposal = await assetDAO.getProposal(proposalId);
      console.log(`Current state: ${getProposalStateName(proposal.state)}`);
      return;
    }
    
    // Execute proposal
    const tx = await assetDAOExecution.executeProposal(proposalId);
    console.log(`Execution transaction hash: ${tx.hash}`);
    
    const receipt = await tx.wait();
    
    // Look for ProposalExecuted event
    const interface = new ethers.Interface([
      "event ProposalExecuted(uint256 indexed proposalId)"
    ]);
    
    const executedLog = receipt.logs
      .map(log => { try { return interface.parseLog(log); } catch (e) { return null; }})
      .filter(log => log && log.name === 'ProposalExecuted')[0];
    
    if (executedLog) {
      console.log(`Proposal ${proposalId} executed successfully`);
    } else {
      console.log(`Proposal execution transaction confirmed, but event not found`);
    }
  } catch (error) {
    console.error('Error executing proposal:', error);
    throw error;
  }
}

// Cancel a proposal
async function cancelProposal(proposalId) {
  try {
    const tx = await assetDAOExecution.cancelProposal(proposalId);
    console.log(`Cancellation transaction hash: ${tx.hash}`);
    
    const receipt = await tx.wait();
    
    // Look for ProposalCanceled event
    const interface = new ethers.Interface([
      "event ProposalCanceled(uint256 indexed proposalId)"
    ]);
    
    const canceledLog = receipt.logs
      .map(log => { try { return interface.parseLog(log); } catch (e) { return null; }})
      .filter(log => log && log.name === 'ProposalCanceled')[0];
    
    if (canceledLog) {
      console.log(`Proposal ${proposalId} canceled successfully`);
    } else {
      console.log(`Proposal cancellation transaction confirmed, but event not found`);
    }
  } catch (error) {
    console.error('Error canceling proposal:', error);
    throw error;
  }
}
```

### 5. Parameter Change Proposals

Parameter change proposals require special handling:

```javascript
// Create a parameter change proposal
async function createParameterChangeProposal(parameterName, newValue, description) {
  // Map parameter names to contract addresses
  const parameterAddresses = {
    'quorum': '0xa87e662061237a121Ca2E83E77dA8251bc4B3529', // AssetDAO address itself
    'votingPeriod': '0xa87e662061237a121Ca2E83E77dA8251bc4B3529',
    'executionDelay': '0xa87e662061237a121Ca2E83E77dA8251bc4B3529',
    'minProposalStake': '0xa87e662061237a121Ca2E83E77dA8251bc4B3529',
    'minVotingBuffer': '0xa87e662061237a121Ca2E83E77dA8251bc4B3529',
    'timelockPeriod': '0xa87e662061237a121Ca2E83E77dA8251bc4B3529'
  };
  
  // Format value based on parameter type
  let formattedValue;
  if (parameterName === 'quorum') {
    // Quorum is in basis points (e.g., 1000 = 10%)
    formattedValue = BigInt(newValue);
  } else if (['votingPeriod', 'executionDelay', 'minVotingBuffer', 'timelockPeriod'].includes(parameterName)) {
    // Time parameters in seconds
    formattedValue = BigInt(newValue);
  } else if (parameterName === 'minProposalStake') {
    // Token amount with 18 decimals
    formattedValue = ethers.parseEther(newValue.toString());
  } else {
    throw new Error(`Unknown parameter: ${parameterName}`);
  }
  
  // Create proposal
  return createProposal(
    ProposalType.ParameterChange,
    parameterAddresses[parameterName],
    formattedValue,
    description
  );
}

// Example usage:
createParameterChangeProposal(
  'quorum',
  1500, // 15%
  'Increase quorum requirement\n\nI propose to increase the quorum requirement from 10% to 15% to ensure broader participation in governance decisions.\n\nThis change will take effect immediately upon execution.'
);
```

## Testing Integration

Before integrating with the D-Loop Protocol in a production environment, it's recommended to:

1. Use the Sepolia testnet for all initial integration testing
2. Start with read-only operations before performing state-changing transactions
3. Test with small amounts before committing to larger transactions
4. Verify all transaction receipts to ensure operations completed successfully

## Error Handling

The D-Loop Protocol contracts use custom error types for better gas efficiency and error reporting. Common errors include:

- `ZeroAddress()`: Attempted to use the zero address where a valid address is required
- `InvalidAmount()`: Amount specified is invalid (often zero or exceeds a limit)
- `Unauthorized()`: Caller does not have the required permissions
- `ProposalNotFound()`: Referenced proposal does not exist
- `ProposalAlreadyExecuted()`: Attempted to execute an already executed proposal

## Security Considerations

When integrating with the D-Loop Protocol:

1. Never expose private keys in client-side code
2. Implement proper input validation before sending transactions
3. Use the latest version of ethers.js (v6+) for all interactions
4. Implement proper error handling for all contract interactions
5. Consider using hardware wallets or secure key management solutions for production deployments

## Support and Resources

For additional support and resources:

- GitHub Repository: [D-Loop Protocol](https://github.com/dloop-protocol)
- Documentation: [D-Loop Protocol Docs](https://docs.dloop.io)
- Community Forum: [D-Loop Community](https://community.dloop.io)

## Obtaining ABIs

Full contract ABIs can be obtained directly from Etherscan using their API:

```javascript
const axios = require('axios');

async function getContractABI(contractAddress) {
  const apiKey = 'HG7DAYXKN5B6AZE35WRDVQRSNN5IDC3ZG6'; // Your Etherscan API key
  const url = `https://api-sepolia.etherscan.io/api?module=contract&action=getabi&address=${contractAddress}&apikey=${apiKey}`;
  
  try {
    const response = await axios.get(url);
    if (response.data.status === '1') {
      return JSON.parse(response.data.result);
    } else {
      throw new Error(`Error fetching ABI: ${response.data.result}`);
    }
  } catch (error) {
    console.error('Error fetching contract ABI:', error);
    return null;
  }
}
