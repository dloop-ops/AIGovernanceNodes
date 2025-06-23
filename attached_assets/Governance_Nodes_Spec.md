
# AI Governance Nodes Specification

## Overview

This specification outlines the requirements for developing AI Governance Nodes using the elizaOS framework. These nodes will automate governance participation in the d-Loop protocol by creating and voting on investment proposals for the AssetDAO.

## Architecture

### Core Components

1. **Node Manager**: Manages up to 5 AI Governance Node instances
2. **Wallet Manager**: Securely stores and manages 5 Ethereum private keys
3. **Smart Contract Interface**: Interfaces with d-Loop protocol contracts
4. **Market Data Service**: Monitors asset prices from multiple sources
5. **Governance Engine**: Implements proposal creation and voting logic

## Technical Requirements

### Environment
- **Framework**: elizaOS (GitHub)
- **Platform**: Node.js/TypeScript
- **Blockchain**: Ethereum (Sepolia testnet initially)
- **Deployment**: Replit

### Smart Contract Integration

#### Required ABIs
- **AssetDAO**: `/client/src/abis/assetdao.abi.v1.json`
- **AI Node Registry**: `/client/src/abis/ainoderegistry.abi.v1.json`
- **DLOOP Token**: `/client/src/abis/dlooptoken.abi.v1.json`

#### Contract Addresses (Sepolia)
- AssetDAO: `0xa87e662061237a121Ca2E83E77dA8C064e83E1A2`
- AI Node Registry: `0x0045c7D99489f1d8A5900243956B0206344417DD`

#### Key Functions
```typescript
// AssetDAO Contract Methods
- createProposal(proposalType, assetAddress, amount, description)
- vote(proposalId, support)
- getProposal(proposalId)
- getProposalCount()

// AI Node Registry Methods
- registerAINode(endpoint, name, description, nodeType)
- getNodeInfo(nodeAddress)
- isNodeActive(nodeAddress)
```

### Wallet Management

#### Security Requirements
- Store 5 Ethereum private keys securely
- Use environment variables for key storage
- Implement key rotation capability
- Each node operates with a unique wallet

#### Storage Format
```env
AI_NODE_1_PRIVATE_KEY=0x...
AI_NODE_2_PRIVATE_KEY=0x...
AI_NODE_3_PRIVATE_KEY=0x...
AI_NODE_4_PRIVATE_KEY=0x...
AI_NODE_5_PRIVATE_KEY=0x...
```

### Market Data Integration

#### CryptoCompare API (Free Tier)
- **Endpoint**: `https://api.cryptocompare.com/data/v2/histohour`
- **Assets**: USDC, WBTC, PAXG, EURT
- **Frequency**: Every 8 hours
- **Authentication**: API key required

#### TradingView Integration
- **Credentials**: Username/password authentication
- **Assets**: USDC, WBTC, PAXG, EURT
- **Purpose**: Secondary price validation
- **Frequency**: Every 8 hours

### Operational Logic

#### Node Behavior
Each AI Governance Node will:

1. **Daily Proposal Creation** (24-hour intervals)
   - Analyze market data trends
   - Calculate optimal asset allocation
   - Create investment/divestment proposals
   - Submit to AssetDAO contract

2. **Voting Activity** (8-hour intervals)
   - Query new proposals from AssetDAO
   - Analyze proposal parameters
   - Cast votes based on algorithmic strategy
   - Track voting history

#### Proposal Types
- **Invest**: Allocate funds to specific assets
- **Divest**: Remove funds from specific assets
- **Rebalance**: Adjust portfolio weightings

## Implementation Structure

### Directory Layout
```
governance-nodes/
├── src/
│   ├── nodes/
│   │   ├── GovernanceNode.ts
│   │   └── NodeManager.ts
│   ├── services/
│   │   ├── WalletService.ts
│   │   ├── ContractService.ts
│   │   ├── MarketDataService.ts
│   │   └── ProposalService.ts
│   ├── strategies/
│   │   ├── BaseStrategy.ts
│   │   └── ConservativeStrategy.ts
│   ├── config/
│   │   ├── contracts.ts
│   │   └── networks.ts
│   └── utils/
│       ├── logger.ts
│       └── scheduler.ts
├── abis/
│   ├── assetdao.json
│   └── ainoderegistry.json
├── .env.example
└── package.json
```

### Core Classes

#### GovernanceNode
```typescript
class GovernanceNode {
  private wallet: ethers.Wallet;
  private nodeId: string;
  
  async createDailyProposal(): Promise<void>;
  async checkAndVoteOnProposals(): Promise<void>;
  async analyzeMarketData(): Promise<MarketAnalysis>;
}
```

#### WalletService
```typescript
class WalletService {
  private keys: string[];
  
  getWallet(nodeIndex: number): ethers.Wallet;
  rotateKeys(): Promise<void>;
}
```

#### ContractService
```typescript
class ContractService {
  private assetDao: ethers.Contract;
  private nodeRegistry: ethers.Contract;
  
  async createProposal(params: ProposalParams): Promise<string>;
  async vote(proposalId: string, support: boolean): Promise<string>;
  async getActiveProposals(): Promise<Proposal[]>;
}
```

### Market Data Models

#### Price Data Structure
```typescript
interface PriceData {
  symbol: string;
  price: number;
  change24h: number;
  volume: number;
  timestamp: number;
}

interface MarketAnalysis {
  recommendations: {
    [asset: string]: {
      action: 'buy' | 'sell' | 'hold';
      confidence: number;
      reasoning: string;
    };
  };
  portfolioRebalance: boolean;
}
```

### Scheduling

#### Cron Jobs
- **Daily Proposals**: `0 12 * * *` (12:00 UTC daily)
- **Voting Checks**: `0 */8 * * *` (Every 8 hours)
- **Market Data**: `0 */8 * * *` (Every 8 hours)

## Configuration

### Environment Variables
```env
# Network Configuration
ETHEREUM_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
CHAIN_ID=11155111

# AI Node Private Keys
AI_NODE_1_PRIVATE_KEY=
AI_NODE_2_PRIVATE_KEY=
AI_NODE_3_PRIVATE_KEY=
AI_NODE_4_PRIVATE_KEY=
AI_NODE_5_PRIVATE_KEY=

# Market Data APIs
CRYPTOCOMPARE_API_KEY=
TRADINGVIEW_USERNAME=
TRADINGVIEW_PASSWORD=

# Contract Addresses
ASSET_DAO_ADDRESS=0xa87e662061237a121Ca2E83E77dA8C064e83E1A2
AI_NODE_REGISTRY_ADDRESS=0x0045c7D99489f1d8A5900243956B0206344417DD

# Operational Settings
PROPOSAL_CREATION_INTERVAL=86400000  # 24 hours in ms
VOTING_CHECK_INTERVAL=28800000       # 8 hours in ms
```

### Node Configuration
```json
{
  "nodes": [
    {
      "id": "ai-gov-01",
      "strategy": "conservative",
      "walletIndex": 0,
      "enabled": true
    },
    {
      "id": "ai-gov-02", 
      "strategy": "aggressive",
      "walletIndex": 1,
      "enabled": true
    }
  ]
}
```

## Deployment Requirements

### Prerequisites
- Node.js 18+
- TypeScript
- ethers.js v6
- elizaOS framework dependencies

### Installation
```bash
npm install
npm run build
npm start
```

### Monitoring
- Implement logging for all node activities
- Track proposal creation success/failure
- Monitor voting participation rates
- Alert on node failures or connectivity issues

## Security Considerations

1. **Private Key Security**
   - Never commit private keys to version control
   - Use encrypted storage for production
   - Implement access controls

2. **API Security**
   - Rate limit API calls
   - Implement retry mechanisms
   - Validate all external data

3. **Smart Contract Security**
   - Validate transaction parameters
   - Implement gas estimation
   - Handle transaction failures gracefully

## Testing Strategy

### Unit Tests
- Wallet management functions
- Market data parsing
- Proposal creation logic
- Voting algorithms

### Integration Tests
- Smart contract interactions
- API connectivity
- End-to-end proposal flow

### Testnet Deployment
- Deploy on Sepolia testnet first
- Test with minimal DLOOP tokens
- Validate all governance functions

## Deliverables

1. **Core Software Package**
   - Complete elizaOS-based implementation
   - Configuration files and documentation
   - Deployment scripts

2. **Documentation**
   - Setup and configuration guide
   - API reference documentation
   - Troubleshooting guide

3. **Testing Suite**
   - Unit and integration tests
   - Testnet validation scripts
   - Performance benchmarks

## Timeline

- **Week 1**: Core architecture and wallet management
- **Week 2**: Smart contract integration and market data services
- **Week 3**: Governance logic and proposal strategies
- **Week 4**: Testing, deployment, and documentation

## Success Criteria

- Successfully deploy 5 AI Governance Nodes
- Create daily proposals automatically
- Vote on existing proposals every 8 hours
- Maintain 95%+ uptime
- Process market data without errors
- Integrate seamlessly with d-Loop protocol contracts
