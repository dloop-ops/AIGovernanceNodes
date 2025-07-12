import { ethers } from 'ethers';
import { Handler } from "@netlify/functions";

// Enhanced RPC Manager for Netlify Functions
class NetlifyRpcManager {
  private providers: ethers.JsonRpcProvider[] = [];
  private currentProviderIndex = 0;
  private lastRequestTime = 0;
  private minRequestInterval = 1500; // 1.5 seconds between requests to prevent rate limiting

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

        // Check for various error types
        const isRateLimit = errorMessage.includes('too many requests') || 
                           errorMessage.includes('rate limit') ||
                           errorMessage.includes('-32005');

        const isABIError = errorMessage.includes('deferred error during abi decoding') ||
                          errorMessage.includes('accessing index 0');

        const isConnectionError = errorMessage.includes('network') ||
                                 errorMessage.includes('timeout') ||
                                 errorMessage.includes('connection');

        // Don't retry ABI decoding errors - they indicate the proposal doesn't exist
        if (isABIError) {
          throw lastError;
        }

        if (isRateLimit || isConnectionError || attempt < maxRetries) {
          console.log(`⚠️ Request failed (attempt ${attempt}/${maxRetries}): ${error.message?.substring(0, 100)}`);

          // Rotate to next provider for rate limits or connection issues
          if (isRateLimit || isConnectionError) {
            this.currentProviderIndex = (this.currentProviderIndex + 1) % this.providers.length;
          }

          // Exponential backoff with jitter - longer delays for rate limits
          const baseDelay = isRateLimit ? 3000 : 1000;
          const backoffDelay = Math.min(baseDelay * Math.pow(2, attempt) + Math.random() * 1000, 15000);
          await this.delay(backoffDelay);
        }
      }
    }

    throw lastError || new Error('All providers failed');
  }
}

// Simple in-memory cache to prevent concurrent requests
const runningRequests = new Map<string, Promise<any>>();

export const handler: Handler = async (event, context) => {
  // Create a simple key for deduplication
  const requestKey = `${event.httpMethod}:${event.path}`;

  // If same request is already running, wait for it
  if (runningRequests.has(requestKey)) {
    console.log(`Deduplicating request: ${requestKey}`);
    try {
      return await runningRequests.get(requestKey);
    } catch (error) {
      runningRequests.delete(requestKey);
      throw error;
    }
  }

  // Create promise for this request
  const requestPromise = (async () => {
    const startTime = Date.now();
    const requestId = Math.random().toString(36).substring(2, 10);
    const TIMEOUT_LIMIT = 20000; // 20 seconds to leave buffer for response

    try {

      // Main function logic wrapped in a promise with proper timeout handling
      const mainLogicPromise = (async () => {
        console.log(`${requestId} INFO   🤖 Netlify Governance Agent Function triggered`);
        console.log(`${requestId} INFO   ⏰ Execution time: ${new Date().toISOString()}`);
        console.log(`${requestId} INFO   🔧 Event type: ${event.httpMethod}`);

        console.log(`${requestId} INFO   🗳️ STARTING NETLIFY GOVERNANCE AGENT`);

        const rpcUrl = process.env.ETHEREUM_RPC_URL;
        if (!rpcUrl) {
          return {
            statusCode: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
              error: 'Environment configuration error',
              message: 'Missing ETHEREUM_RPC_URL',
              timestamp: new Date().toISOString()
            })
          };
        }

        // Initialize RPC Manager with shorter timeouts
        const rpcManager = new NetlifyRpcManager();

        // Quick connection test with 5 second timeout
        const network = await Promise.race([
          rpcManager.executeWithRetry(async (provider) => {
            return await provider.getNetwork();
          }, 1), // Only 1 retry
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Network connection timeout')), 5000)
          )
        ]);

        console.log(`${requestId} INFO   ✅ Connected to network: ${network.name}`);

        // AssetDAO contract setup
        const assetDAOAddress = process.env.ASSET_DAO_CONTRACT_ADDRESS || '0xa87e662061237a121Ca2E83E77dA8251bc4B3529';
        const assetDAOABI = [
          "function getProposalCount() external view returns (uint256)",
          "function getProposal(uint256) external view returns (tuple(address proposer, uint8 proposalType, address assetAddress, uint256 amount, string description, uint256 votesFor, uint256 votesAgainst, uint256 startTime, uint256 endTime, bool executed, bool cancelled, uint8 state) proposal)"
        ];

        // Get proposal count with 5 second timeout
        const proposalCount = await Promise.race([
          rpcManager.executeWithRetry(async (provider) => {
            const contract = new ethers.Contract(assetDAOAddress, assetDAOABI, provider);
            return await contract.getProposalCount();
          }, 1), // Only 1 retry
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Proposal count timeout')), 5000)
          )
        ]);

        const totalProposals = Number(proposalCount);
        console.log(`${requestId} INFO   📊 Total proposals: ${totalProposals}`);

        if (totalProposals === 0) {
          return {
            statusCode: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
              success: true,
              message: 'No proposals exist yet',
              proposalsChecked: 0,
              timestamp: new Date().toISOString()
            })
          };
        }

        // Only check last 5 proposals to stay within time limit
        const startIndex = Math.max(1, totalProposals - 4);
        const endIndex = totalProposals;
        const activeProposals = [];

        console.log(`${requestId} INFO   🔍 Checking proposals ${startIndex} to ${endIndex}...`);

        // Process proposals with strict time limit
        const proposalPromises = [];
        for (let i = startIndex; i <= endIndex; i++) {
          const proposalPromise = Promise.race([
            (async () => {
              try {
                const proposal = await rpcManager.executeWithRetry(async (provider) => {
                  const contract = new ethers.Contract(assetDAOAddress, assetDAOABI, provider);
                  return await contract.getProposal(i);
                }, 1); // Only 1 retry

                // Quick validation
                if (proposal.proposer === '0x0000000000000000000000000000000000000000') {
                  return null;
                }

                const proposalState = proposal.state;
                if (proposalState === 1n || proposalState === 4n) { // Active or Pending
                  return {
                    id: i,
                    state: proposalState.toString(),
                    type: proposal.proposalType.toString(),
                    description: proposal.description || `Proposal ${i}`,
                    proposer: proposal.proposer,
                    assetAddress: proposal.assetAddress,
                    amount: proposal.amount.toString(),
                    startTime: proposal.startTime.toString(),
                    endTime: proposal.endTime.toString(),
                    forVotes: proposal.votesFor.toString(),
                    againstVotes: proposal.votesAgainst.toString()
                  };
                }
                return null;
              } catch (error) {
                console.log(`${requestId} WARN   ⚠️ Proposal ${i}: ${error instanceof Error ? error.message.substring(0, 50) : 'Unknown error'}`);
                return null;
              }
            })(),
            new Promise<null>((resolve) => 
              setTimeout(() => resolve(null), 3000) // 3 second timeout per proposal
            )
          ]);
          
          proposalPromises.push(proposalPromise);
        }

        // Wait for all proposals with overall timeout
        const proposalResults = await Promise.race([
          Promise.all(proposalPromises),
          new Promise<null[]>((resolve) => 
            setTimeout(() => resolve(new Array(proposalPromises.length).fill(null)), 10000)
          )
        ]);

        // Filter out null results
        for (const result of proposalResults) {
          if (result) {
            activeProposals.push(result);
          }
        }

        console.log(`${requestId} INFO   🗳️ Found ${activeProposals.length} active proposals`);

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
      })();

      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          console.log(`${requestId} ERROR  ⏰ Function timeout after ${TIMEOUT_LIMIT / 1000} seconds`);
          reject(new Error(`Function timeout after ${TIMEOUT_LIMIT / 1000} seconds`));
        }, TIMEOUT_LIMIT);
      });

      // Race between main logic and timeout
      return await Promise.race([mainLogicPromise, timeoutPromise]);

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
  })();

  // Store the promise
  runningRequests.set(requestKey, requestPromise);

  try {
    const result = await requestPromise;
    runningRequests.delete(requestKey);
    return result;
  } catch (error) {
    runningRequests.delete(requestKey);
    throw error;
  }
};