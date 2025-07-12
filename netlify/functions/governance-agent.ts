import { ethers } from 'ethers';

// Enhanced RPC Manager for Netlify Functions
class NetlifyRpcManager {
  private providers: ethers.JsonRpcProvider[] = [];
  private currentProviderIndex = 0;
  private lastRequestTime = 0;
  private minRequestInterval = 1000; // 1 second between requests

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders() {
    const endpoints = [
      process.env.ETHEREUM_RPC_URL || 'https://sepolia.infura.io/v3/ca485bd6567e4c5fb5693ee66a5885d8',
      'https://sepolia.infura.io/v3/60755064a92543a1ac7aaf4e20b71cdf',
      'https://sepolia.gateway.tenderly.co/public',
      'https://ethereum-sepolia-rpc.publicnode.com'
    ].filter(url => url && !url.includes('undefined'));

    this.providers = endpoints.map(url => new ethers.JsonRpcProvider(url, {
      name: 'sepolia',
      chainId: 11155111
    }));

    console.log(`🔗 Initialized ${this.providers.length} RPC providers`);
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest;
      await this.delay(waitTime);
    }

    this.lastRequestTime = Date.now();
  }

  async executeWithRetry<T>(
    operation: (provider: ethers.JsonRpcProvider) => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.enforceRateLimit();

        const provider = this.providers[this.currentProviderIndex];
        const result = await Promise.race([
          operation(provider),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Operation timeout')), 15000)
          )
        ]);

        return result;
      } catch (error: any) {
        lastError = error;
        const errorMessage = error.message?.toLowerCase() || '';

        // Check for rate limiting or connection errors
        const isRateLimit = errorMessage.includes('too many requests') || 
                           errorMessage.includes('rate limit') ||
                           errorMessage.includes('-32005');

        if (isRateLimit || attempt < maxRetries) {
          console.log(`⚠️ Request failed (attempt ${attempt}/${maxRetries}): ${error.message?.substring(0, 100)}`);

          // Rotate to next provider
          this.currentProviderIndex = (this.currentProviderIndex + 1) % this.providers.length;

          // Exponential backoff with jitter
          const backoffDelay = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 1000, 10000);
          await this.delay(backoffDelay);
        }
      }
    }

    throw lastError || new Error('All providers failed');
  }
}

export const handler = async (event: any, context: any) => {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(2, 10);

  console.log(`${requestId} INFO   🤖 Netlify Governance Agent Function triggered`);
  console.log(`${requestId} INFO   ⏰ Execution time: ${new Date().toISOString()}`);
  console.log(`${requestId} INFO   🔧 Event type: ${event.httpMethod}`);
  console.log(`${requestId} INFO   🔧 Function path: ${event.path}`);

  try {
    console.log(`${requestId} INFO   🗳️ STARTING NETLIFY GOVERNANCE AGENT`);
    console.log(`${requestId} INFO   =====================================`);
    console.log(`${requestId} INFO   ⏰ Start time: ${new Date().toISOString()}`);

    // Check environment variables
    console.log(`${requestId} INFO   🔍 Checking environment variables...`);
    const rpcUrl = process.env.ETHEREUM_RPC_URL;
    const etherscanApiKey = process.env.ETHERSCAN_API_KEY;

    console.log(`${requestId} INFO   📋 Available environment variables:`);
    console.log(`${requestId} INFO      AI_NODE_3_PRIVATE_KEY: ${process.env.AI_NODE_3_PRIVATE_KEY ? '✅ SET' : '❌ NOT SET'}`);
    console.log(`${requestId} INFO      ETHEREUM_RPC_URL: ${rpcUrl ? '✅ SET' : '❌ NOT SET'}`);
    console.log(`${requestId} INFO      AI_NODE_5_PRIVATE_KEY: ${process.env.AI_NODE_5_PRIVATE_KEY ? '✅ SET' : '❌ NOT SET'}`);
    console.log(`${requestId} INFO      AI_NODE_2_PRIVATE_KEY: ${process.env.AI_NODE_2_PRIVATE_KEY ? '✅ SET' : '❌ NOT SET'}`);
    console.log(`${requestId} INFO      ETHERSCAN_API_KEY: ${etherscanApiKey ? '✅ SET' : '❌ NOT SET'}`);
    console.log(`${requestId} INFO      AI_NODE_4_PRIVATE_KEY: ${process.env.AI_NODE_4_PRIVATE_KEY ? '✅ SET' : '❌ NOT SET'}`);
    console.log(`${requestId} INFO      AI_NODE_1_PRIVATE_KEY: ${process.env.AI_NODE_1_PRIVATE_KEY ? '✅ SET' : '❌ NOT SET'}`);

    if (!rpcUrl || !etherscanApiKey) {
      const missingVars: string[] = [];
      if (!rpcUrl) missingVars.push('ETHEREUM_RPC_URL');
      if (!etherscanApiKey) missingVars.push('ETHERSCAN_API_KEY');

      // Check for AI node private keys
      for (let i = 1; i <= 5; i++) {
        const keyName = `AI_NODE_${i}_PRIVATE_KEY`;
        if (!process.env[keyName]) {
          missingVars.push(keyName);
        }
      }

      console.log(`${requestId} ERROR  ❌ Environment validation failed: Missing required environment variables: ${missingVars.join(', ')}`);
      console.log(`${requestId} INFO   💡 Environment Setup Guide:`);
      console.log(`${requestId} INFO      1. Go to Netlify Dashboard > Site Settings > Environment Variables`);
      console.log(`${requestId} INFO      2. Set ETHEREUM_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID`);
      console.log(`${requestId} INFO      3. Set ETHERSCAN_API_KEY=HG7DAYXKN5B6AZE35WRDVQRSNN5IDC3ZG6`);
      console.log(`${requestId} INFO      4. Set AI_NODE_1_PRIVATE_KEY=0x... (64 hex characters)`);
      console.log(`${requestId} INFO      5. Repeat for AI_NODE_2_PRIVATE_KEY through AI_NODE_5_PRIVATE_KEY`);

      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          error: 'Environment configuration error',
          message: `Missing or invalid environment variables: ${missingVars.join(', ')}`,
          timestamp: new Date().toISOString(),
          setup_guide: {
            step1: 'Go to Netlify Dashboard > Site Settings > Environment Variables',
            step2: 'Set ETHEREUM_RPC_URL to your Infura Sepolia endpoint',
            step3: 'Set ETHERSCAN_API_KEY=HG7DAYXKN5B6AZE35WRDVQRSNN5IDC3ZG6',
            step4: 'Set AI_NODE_*_PRIVATE_KEY variables (must be 64 hex characters)',
            step5: 'Redeploy the site after setting environment variables'
          },
          required_vars: [
            'ETHEREUM_RPC_URL',
            'ETHERSCAN_API_KEY', 
            'AI_NODE_1_PRIVATE_KEY',
            'AI_NODE_2_PRIVATE_KEY',
            'AI_NODE_3_PRIVATE_KEY',
            'AI_NODE_4_PRIVATE_KEY',
            'AI_NODE_5_PRIVATE_KEY'
          ]
        })
      };
    }

    // Initialize RPC Manager
    const rpcManager = new NetlifyRpcManager();

    // Log sanitized URL (hide the key)
    const sanitizedUrl = rpcUrl.replace(/\/v3\/.*$/, '/v3/[HIDDEN]');
    console.log('🌐 Using RPC URL:', sanitizedUrl);

    // Test connection with retry logic
    console.log('🔗 Connecting to Ethereum provider...');
    const network = await rpcManager.executeWithRetry(async (provider) => {
      return await provider.getNetwork();
    });

    console.log('✅ Connected to network:', network.name, 'Chain ID:', network.chainId.toString());

    // AssetDAO contract setup
    const assetDAOAddress = process.env.ASSET_DAO_CONTRACT_ADDRESS || '0xa87e662061237a121Ca2E83E77dA8251bc4B3529';
    console.log('📋 AssetDAO contract address:', assetDAOAddress);

    const assetDAOABI = [
      "function getProposalCount() external view returns (uint256)",
      "function getProposal(uint256) external view returns (tuple(address proposer, uint8 proposalType, address assetAddress, uint256 amount, string description, uint256 votesFor, uint256 votesAgainst, uint256 startTime, uint256 endTime, bool executed, bool cancelled, uint8 state) proposal)",
      "function hasVoted(uint256 proposalId, address voter) external view returns (bool)"
    ];

    // Get proposal count with retry logic
    console.log('📊 Fetching proposal count...');
    const proposalCount = await rpcManager.executeWithRetry(async (provider) => {
      const contract = new ethers.Contract(assetDAOAddress, assetDAOABI, provider);
      return await contract.getProposalCount();
    });

    console.log('📊 Total proposals:', proposalCount.toString());

    // Check last 10 proposals for active ones
    const totalProposals = Number(proposalCount);
    const startIndex = Math.max(1, totalProposals - 9); // Check last 10 proposals
    const endIndex = totalProposals;

    console.log(`🔍 Checking proposals ${startIndex} to ${endIndex}...`);

    const activeProposals = [];

    // Check each proposal sequentially with rate limiting
    for (let i = startIndex; i <= endIndex; i++) {
      try {
        // Get proposal details with retry logic
        const proposal = await rpcManager.executeWithRetry(async (provider) => {
          const contract = new ethers.Contract(assetDAOAddress, assetDAOABI, provider);
          return await contract.getProposal(i);
        });

        const proposalState = proposal.state;

        console.log(`📋 Proposal ${i}: State ${proposalState}, Type ${proposal.proposalType}`);

        // State 1 = Active, State 4 = Pending
        if (proposalState === 1n || proposalState === 4n) {
          activeProposals.push({
            id: i,
            state: proposalState.toString(),
            type: proposal.proposalType.toString(),
            description: proposal.description,
            proposer: proposal.proposer,
            assetAddress: proposal.assetAddress,
            amount: proposal.amount.toString(),
            startTime: proposal.startTime.toString(),
            endTime: proposal.endTime.toString(),
            forVotes: proposal.votesFor.toString(),
            againstVotes: proposal.votesAgainst.toString()
          });
        }

      } catch (error: any) {
        console.log(`⚠️ Could not fetch proposal ${i}: ${error.message?.substring(0, 100)}`);
        // Continue with next proposal even if this one fails
        continue;
      }
    }

    if (activeProposals.length === 0) {
      console.log('ℹ️ No active proposals found');
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: true,
          message: 'No active proposals to vote on',
          proposalsChecked: Number(proposalCount),
          timestamp: new Date().toISOString()
        })
      };
    }

    console.log(`🗳️ Found ${activeProposals.length} active proposals`);

    // Log the proposals found
    activeProposals.forEach(proposal => {
      console.log(`📋 Proposal ${proposal.id}: Type ${proposal.type}, Description: ${proposal.description.substring(0, 50)}...`);
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        message: `Found ${activeProposals.length} active proposals`,
        proposals: activeProposals,
        network: {
          name: network.name,
          chainId: network.chainId.toString()
        },
        timestamp: new Date().toISOString()
      })
    };

  } catch (error: any) {
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      info: error.info,
      stack: error.stack
    });

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: error.message,
        errorCode: error.code,
        timestamp: new Date().toISOString(),
        troubleshooting: 'Check Netlify function logs for detailed error information'
      })
    };
  } finally {
    const endTime = Date.now();
    const duration = endTime - startTime;
    console.log(`${requestId} INFO   ⏱️  Execution duration: ${duration}ms`);
    console.log(`${requestId} INFO   =====================================`);
    console.log(`${requestId} INFO   ✅ Netlify Governance Agent Function finished`);
  }
};