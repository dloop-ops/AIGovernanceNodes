import { ethers } from 'ethers';
import { Handler } from "@netlify/functions";

// Enhanced RPC Manager for Netlify Functions
class NetlifyRpcManager {
  private providers: ethers.JsonRpcProvider[] = [];
  private currentProviderIndex = 0;
  private lastRequestTime = 0;
  private minRequestInterval = 500; // 0.5 seconds between requests to prevent rate limiting

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
    maxRetries: number = 2
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.enforceRateLimit();

        const provider = this.providers[this.currentProviderIndex];
        const result = await Promise.race([
          operation(provider),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Operation timeout')), 5000)
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
                          errorMessage.includes('accessing index 0') ||
                          errorMessage.includes('does not exist or has invalid data');

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

          // Shorter backoff delays
          const baseDelay = isRateLimit ? 1000 : 500;
          const backoffDelay = Math.min(baseDelay * attempt + Math.random() * 500, 3000);
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
    const TIMEOUT_LIMIT = 15000; // 15 seconds to leave buffer for response

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

        // Quick connection test with 3 second timeout
        const network = await Promise.race([
          rpcManager.executeWithRetry(async (provider) => {
            return await provider.getNetwork();
          }, 1), // Only 1 retry
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Network connection timeout')), 3000)
          )
        ]);

        console.log(`${requestId} INFO   ✅ Connected to network: ${network.name}`);

        // AssetDAO contract setup
        const assetDAOAddress = process.env.ASSET_DAO_CONTRACT_ADDRESS || '0xa87e662061237a121Ca2E83E77dA8251bc4B3529';
        const assetDAOABI = [
          "function getProposalCount() external view returns (uint256)",
          "function getProposal(uint256) external view returns (uint256, uint8, address, uint256, string, address, uint256, uint256, uint256, uint256, uint8, bool)",
          "function proposals(uint256) external view returns (uint256, uint8, address, uint256, string, address, uint256, uint256, uint256, uint256, uint8, bool)"
        ];

        // Get proposal count with 3 second timeout
        const proposalCount = await Promise.race([
          rpcManager.executeWithRetry(async (provider) => {
            const contract = new ethers.Contract(assetDAOAddress, assetDAOABI, provider);
            return await contract.getProposalCount();
          }, 1), // Only 1 retry
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Proposal count timeout')), 3000)
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

        // Check last 25 proposals to find active ones (expanded range)
        const startIndex = Math.max(1, totalProposals - 24);
        const endIndex = totalProposals;
        const activeProposals = [];

        console.log(`${requestId} INFO   🔍 Checking proposals ${startIndex} to ${endIndex} (expanded range)...`);

        // Process proposals sequentially with strict time limits
        for (let i = startIndex; i <= endIndex; i++) {
          try {
            const proposalResult = await Promise.race([
              (async () => {
                try {
                  // Try proposals mapping first, fallback to getProposal
                  const proposalData = await rpcManager.executeWithRetry(async (provider) => {
                    const contract = new ethers.Contract(assetDAOAddress, assetDAOABI, provider);
                    try {
                      return await contract.proposals(i);
                    } catch (error) {
                      console.log(`${requestId} WARN   Proposals mapping failed for ${i}, trying getProposal...`);
                      return await contract.getProposal(i);
                    }
                  }, 1); // Only 1 retry

                  // Parse the returned array structure: [id, type, proposer, amount, description, assetAddress, votesFor, votesAgainst, startTime, endTime, state, executed]
                  
                  // Enhanced validation - check if proposal data is valid
                  if (!proposalData || proposalData.length < 12) {
                    console.log(`${requestId} WARN   ⚠️ Proposal ${i} has invalid data structure - skipping`);
                    return null;
                  }

                  const proposer = proposalData[2];

                  // Quick validation - check if proposer is zero address
                  if (!proposer || proposer === '0x0000000000000000000000000000000000000000') {
                    console.log(`${requestId} WARN   ⚠️ Proposal ${i} has zero address proposer - skipping`);
                    return null;
                  }

                  const proposalState = Number(proposalData[10]); // state is at index 10, convert to number
                  console.log(`${requestId} INFO   📊 Proposal ${i} state: ${proposalState}`);

                  // CRITICAL FIX: Handle zero timestamps and search for actual timestamp fields
                  const currentTimeSec = Math.floor(Date.now() / 1000);
                  let foundEndTime = 0;
                  let foundStartTime = 0;

                  // Enhanced timestamp search - use the logs showing startTime at index 6, endTime at index 7
                  console.log(`${requestId} DEBUG  🔍 Searching all proposal fields for timestamps...`);
                  console.log(`${requestId} DEBUG  📋 Proposal data array length: ${proposalData.length}`);
                  
                  // Search ALL fields for any valid timestamps
                  for (let idx = 0; idx < proposalData.length; idx++) {
                    try {
                      const rawValue = proposalData[idx];
                      const value = typeof rawValue === 'bigint' ? Number(rawValue) : Number(rawValue);

                      // Skip invalid values
                      if (isNaN(value) || value === 0 || value < 1000000000) {
                        console.log(`${requestId} DEBUG  ⏭️  Index ${idx}: ${rawValue} (skipped - invalid)`);
                        continue;
                      }

                      // Convert from milliseconds if needed
                      const asSeconds = value > currentTimeSec * 1000 ? Math.floor(value / 1000) : value;

                      // Check if it's a reasonable timestamp (past or future, within 2 years)
                      const twoYearsAgo = currentTimeSec - (2 * 365 * 24 * 60 * 60);
                      const twoYearsFromNow = currentTimeSec + (2 * 365 * 24 * 60 * 60);
                      
                      if (asSeconds >= twoYearsAgo && asSeconds <= twoYearsFromNow) {
                        console.log(`${requestId} DEBUG  📅 Index ${idx}: Found timestamp ${asSeconds} (${new Date(asSeconds * 1000).toISOString()})`);
                        
                        // Prioritize future timestamps as endTime
                        if (asSeconds > currentTimeSec && foundEndTime === 0) {
                          foundEndTime = asSeconds;
                          console.log(`${requestId} DEBUG  ✅ Set as endTime: ${foundEndTime}`);
                        } else if (asSeconds <= currentTimeSec && foundStartTime === 0) {
                          foundStartTime = asSeconds;
                          console.log(`${requestId} DEBUG  ✅ Set as startTime: ${foundStartTime}`);
                        }
                      } else {
                        console.log(`${requestId} DEBUG  ⏭️  Index ${idx}: ${asSeconds} (out of reasonable range)`);
                      }
                    } catch (error) {
                      console.log(`${requestId} DEBUG  ❌ Index ${idx}: Parse error`);
                      continue;
                    }
                  }
                  
                  // If we found a start time but no end time, calculate a reasonable end time
                  if (foundStartTime > 0 && foundEndTime === 0) {
                    // Default voting period is 72 hours (259200 seconds)
                    foundEndTime = foundStartTime + 259200;
                    console.log(`${requestId} DEBUG  🕐 Calculated endTime from startTime: ${foundEndTime} (${new Date(foundEndTime * 1000).toISOString()})`);
                  }

                  const normalizedEndTime = foundEndTime;
                  const normalizedStartTime = foundStartTime;
                  const normalizedCurrentTime = currentTimeSec;

                  console.log(`${requestId} DEBUG  🕐 Proposal ${i} - Raw endTime: ${proposalData[9]}, Found endTime: ${normalizedEndTime}, Current: ${normalizedCurrentTime}`);
                  console.log(`${requestId} DEBUG  📅 Proposal ${i} - End date: ${normalizedEndTime > 0 ? new Date(normalizedEndTime * 1000).toISOString() : 'NOT_FOUND'}, Current: ${new Date(normalizedCurrentTime * 1000).toISOString()}`);

                  if (proposalState === 1) { // Only check Active proposals (state = 1)
                    // Check if proposal is still within voting period
                    if (normalizedEndTime > 0 && normalizedEndTime > normalizedCurrentTime) {
                      const timeLeftSeconds = normalizedEndTime - normalizedCurrentTime;
                      const timeLeftHours = Math.floor(timeLeftSeconds / 3600);
                      console.log(`${requestId} INFO   ✅ Found ACTIVE proposal ${i} (${timeLeftHours}h ${Math.floor((timeLeftSeconds % 3600) / 60)}m remaining)`);
                      return {
                        id: i,
                        state: proposalState.toString(),
                        type: proposalData[1].toString(),
                        description: proposalData[4] || `Proposal ${i}`,
                        proposer: proposer,
                        assetAddress: proposalData[5],
                        amount: proposalData[3].toString(),
                        startTime: normalizedStartTime > 0 ? normalizedStartTime.toString() : proposalData[8].toString(),
                        endTime: normalizedEndTime.toString(),
                        forVotes: proposalData[6].toString(),
                        againstVotes: proposalData[7].toString(),
                        timeLeft: timeLeftSeconds
                      };
                    } else {
                      const expiredSeconds = normalizedCurrentTime - normalizedEndTime;
                      const expiredHours = Math.floor(expiredSeconds / 3600);
                      const expiredDays = Math.floor(expiredHours / 24);

                      if (expiredDays > 0) {
                        console.log(`${requestId} INFO   ⏰ Proposal ${i} voting period expired ${expiredDays}d ${expiredHours % 24}h ago`);
                      } else {
                        console.log(`${requestId} INFO   ⏰ Proposal ${i} voting period expired ${expiredHours}h ${Math.floor((expiredSeconds % 3600) / 60)}m ago`);
                      }
                    }
                  } else {
                    console.log(`${requestId} INFO   ℹ️  Proposal ${i} not active (state: ${proposalState})`);
                  }
                  return null;
                } catch (error) {
                  console.log(`${requestId} WARN   ⚠️ Proposal ${i}: ${error instanceof Error ? error.message.substring(0, 50) : 'Unknown error'}`);
                  return null;
                }
              })(),
              new Promise<null>((resolve) => 
                setTimeout(() => resolve(null), 2000) // 2 second timeout per proposal
              )
            ]);

            if (proposalResult) {
              activeProposals.push(proposalResult);
            }
          } catch (error) {
            console.log(`${requestId} WARN   ⚠️ Skipped proposal ${i} due to timeout`);
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

      // Race between main logic and timeout with proper cleanup
      let timeoutId;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          console.log(`${requestId} ERROR  ⏰ Function timeout after ${TIMEOUT_LIMIT / 1000} seconds`);
          reject(new Error(`Function timeout after ${TIMEOUT_LIMIT / 1000} seconds`));
        }, TIMEOUT_LIMIT);
      });

      try {
        const result = await Promise.race([mainLogicPromise, timeoutPromise]);
        clearTimeout(timeoutId);
        return result;
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }

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