
import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { ethers } from 'ethers';

// Rate limiting tracking
const lastRequestTime = new Map<string, number>();
const MIN_REQUEST_INTERVAL = 10000; // 10 seconds between requests per provider

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  const requestId = Math.random().toString(36).substring(7);

  console.log(`${requestId} INFO   🤖 Netlify Governance Agent Function triggered`);
  console.log(`${requestId} INFO   ⏰ Execution time: ${new Date().toISOString()}`);
  console.log(`${requestId} INFO   🔧 Event type: ${event.httpMethod || 'SCHEDULED'}`);
  console.log(`${requestId} INFO   🗳️ STARTING NETLIFY GOVERNANCE AGENT`);

  try {
    // Rate limiting check - prevent excessive calls
    const now = Date.now();
    const lastCall = lastRequestTime.get('global') || 0;
    if (now - lastCall < MIN_REQUEST_INTERVAL) {
      console.log(`${requestId} INFO   ⏸️  Rate limiting: Skipping call (${Math.round((MIN_REQUEST_INTERVAL - (now - lastCall)) / 1000)}s remaining)`);
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          message: 'Rate limited - skipped execution',
          nextAllowedTime: new Date(lastCall + MIN_REQUEST_INTERVAL).toISOString()
        })
      };
    }
    lastRequestTime.set('global', now);

    // Initialize providers with staggered priority and rate limit tracking
    const providers = [
      {
        url: process.env.ETHEREUM_RPC_URL || 'https://sepolia.infura.io/v3/ca485bd6567e4c5fb5693ee66a5885d8',
        name: 'Infura',
        priority: 1,
        maxRetries: 2
      },
      {
        url: 'https://ethereum-sepolia-rpc.publicnode.com',
        name: 'PublicNode',
        priority: 2,
        maxRetries: 3
      },
      {
        url: 'https://rpc.sepolia.org',
        name: 'Sepolia.org',
        priority: 3,
        maxRetries: 3
      },
      {
        url: 'https://sepolia.gateway.tenderly.co',
        name: 'Tenderly',
        priority: 4,
        maxRetries: 2
      }
    ];

    console.log(`🔗 Initialized ${providers.length} RPC providers with rate limiting`);

    let provider: ethers.JsonRpcProvider | null = null;
    let selectedProvider: any = null;

    // Try providers in priority order with enhanced error handling
    for (const providerConfig of providers) {
      const lastProviderCall = lastRequestTime.get(providerConfig.name) || 0;
      const timeSinceLastCall = now - lastProviderCall;

      // Skip provider if called too recently (per-provider rate limiting)
      if (timeSinceLastCall < 5000) { // 5 second cooldown per provider
        console.log(`⏸️  Skipping ${providerConfig.name} (cooldown: ${Math.round((5000 - timeSinceLastCall) / 1000)}s)`);
        continue;
      }

      try {
        console.log(`🔄 Testing ${providerConfig.name}...`);
        const testProvider = new ethers.JsonRpcProvider(providerConfig.url);

        // Extended timeout for better reliability (10 seconds)
        const networkPromise = testProvider.getNetwork();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Network connection timeout')), 10000)
        );

        await Promise.race([networkPromise, timeoutPromise]);

        provider = testProvider;
        selectedProvider = providerConfig;
        lastRequestTime.set(providerConfig.name, now);

        const network = await provider.getNetwork();
        console.log(`${requestId} INFO   ✅ Connected to network: ${network.name} via ${providerConfig.name}`);
        break;
      } catch (error: any) {
        console.log(`❌ ${providerConfig.name} failed: ${error.message.substring(0, 50)}...`);
        lastRequestTime.set(providerConfig.name, now); // Mark as recently attempted

        // Add delay before trying next provider to avoid rapid requests
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    if (!provider || !selectedProvider) {
      throw new Error('All RPC providers failed or are rate limited');
    }

    // FIXED: Enhanced address validation that properly handles 42-character addresses
    const rawAssetDaoAddress = process.env.ASSET_DAO_ADDRESS || process.env.ASSET_DAO_CONTRACT_ADDRESS || '0xa87e662061237a121Ca2E83E77dA8C251bc4B3529';

    console.log(`${requestId} INFO   🔍 Validating address: "${rawAssetDaoAddress}" (length: ${rawAssetDaoAddress.length})`);

    let assetDaoAddress: string;
    try {
      // Use ethers.getAddress directly as it handles validation properly
      // This function validates checksums and normalizes the address
      assetDaoAddress = ethers.getAddress(rawAssetDaoAddress.trim());
      console.log(`${requestId} INFO   ✅ Address validation passed: ${assetDaoAddress}`);
    } catch (error: any) {
      console.log(`${requestId} ERROR  ❌ Address validation failed for: "${rawAssetDaoAddress}"`);
      console.log(`${requestId} ERROR  ❌ Validation error: ${error.message}`);
      
      // Try to fix common checksum issues by converting to lowercase and back
      try {
        const fixedAddress = ethers.getAddress(rawAssetDaoAddress.toLowerCase());
        console.log(`${requestId} INFO   🔧 Fixed address checksum: ${fixedAddress}`);
        assetDaoAddress = fixedAddress;
      } catch (fixError: any) {
        throw new Error(`Invalid AssetDAO contract address: ${error.message}`);
      }
    }

    const assetDAOABI = [
      "function getProposalCount() external view returns (uint256)",
      "function getProposal(uint256) external view returns (uint256, uint8, address, uint256, string, address, uint256, uint256, uint256, uint256, uint8, bool)"
    ];

    const contract = new ethers.Contract(assetDaoAddress, assetDAOABI, provider);

    // Enhanced contract call with exponential backoff
    const callContractWithRetry = async (contractCall: () => Promise<any>, maxRetries: number = 3): Promise<any> => {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const result = await Promise.race([
            contractCall(),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Contract call timeout')), 15000)
            )
          ]);
          return result;
        } catch (error: any) {
          console.log(`⚠️ Contract call attempt ${attempt}/${maxRetries} failed: ${error.message.substring(0, 50)}...`);

          if (error.message.includes('Too Many Requests') || error.code === 'BAD_DATA') {
            // Exponential backoff for rate limits
            const delay = Math.min(2000 * Math.pow(2, attempt - 1), 10000);
            console.log(`⏸️  Rate limit detected, waiting ${delay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          } else if (attempt === maxRetries) {
            throw error;
          } else {
            // Standard retry delay
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }
        }
      }
    };

    // Get proposal count with retry
    console.log(`${requestId} INFO   🔍 Fetching active proposals...`);
    const proposalCount = await callContractWithRetry(() => contract.getProposalCount());
    const totalProposals = Number(proposalCount);

    if (totalProposals === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: 'No proposals exist yet',
          proposalsChecked: 0,
          timestamp: new Date().toISOString()
        })
      };
    }

    // Check last 8 proposals to find active ones (limited range to prevent timeout)
    const startIndex = Math.max(1, totalProposals - 7);
    const endIndex = totalProposals;
    const activeProposals = [];

    console.log(`${requestId} INFO   🔍 Checking proposals ${startIndex} to ${endIndex} (optimized range)...`);

    // Circuit breaker to prevent infinite loops
    let consecutiveFailures = 0;
    const MAX_CONSECUTIVE_FAILURES = 3;

    // Process proposals sequentially with strict time limits
    for (let i = startIndex; i <= endIndex; i++) {
      try {
        // Progressive delay based on failure rate
        if (i > startIndex) {
          const baseDelay = 800 + (consecutiveFailures * 200);
          await new Promise(resolve => setTimeout(resolve, baseDelay));
        }

        const proposalData = await callContractWithRetry(() => contract.getProposal(i), 2);

        // Enhanced validation - check if proposal data is valid
        if (!proposalData || proposalData.length < 12) {
          console.log(`${requestId} WARN   ⚠️ Proposal ${i} has invalid data structure - skipping`);
          consecutiveFailures++;
          continue;
        }

        // Reset failure counter on success
        consecutiveFailures = 0;

        const proposer = proposalData[2];

        // Quick validation - check if proposer is zero address
        if (!proposer || proposer === '0x0000000000000000000000000000000000000000') {
          console.log(`${requestId} WARN   ⚠️ Proposal ${i} has zero address proposer - skipping`);
          continue;
        }

        const proposalState = Number(proposalData[10]); // state is at index 10
        console.log(`${requestId} INFO   📊 Proposal ${i} state: ${proposalState}`);

        // Enhanced timestamp handling
        const currentTimeSec = Math.floor(Date.now() / 1000);
        let endTime = 0;

        // Try multiple timestamp fields with proper validation
        const potentialEndTimes = [proposalData[9], proposalData[7], proposalData[8]];
        
        for (const timeField of potentialEndTimes) {
          try {
            const timeValue = Number(timeField);
            
            // Check if it's a valid future timestamp
            if (timeValue > currentTimeSec && timeValue < (currentTimeSec + (365 * 24 * 60 * 60))) {
              endTime = timeValue;
              break;
            }
          } catch (error) {
            continue;
          }
        }

        console.log(`${requestId} DEBUG  🕐 Proposal ${i} - End time: ${endTime}, Current: ${currentTimeSec}`);

        if (proposalState === 1) { // Only check Active proposals (state = 1)
          // Check if proposal is still within voting period
          if (endTime > 0 && endTime > currentTimeSec) {
            const timeLeftSeconds = endTime - currentTimeSec;
            const timeLeftHours = Math.floor(timeLeftSeconds / 3600);
            console.log(`${requestId} INFO   ✅ Found ACTIVE proposal ${i} (${timeLeftHours}h ${Math.floor((timeLeftSeconds % 3600) / 60)}m remaining)`);
            
            activeProposals.push({
              id: i,
              state: proposalState.toString(),
              type: proposalData[1].toString(),
              description: proposalData[4] || `Proposal ${i}`,
              proposer: proposer,
              assetAddress: proposalData[5],
              amount: proposalData[3].toString(),
              startTime: proposalData[8].toString(),
              endTime: endTime.toString(),
              forVotes: proposalData[6].toString(),
              againstVotes: proposalData[7].toString(),
              timeLeft: timeLeftSeconds
            });
          } else {
            console.log(`${requestId} INFO   ⏰ Proposal ${i} voting period expired or invalid`);
          }
        } else {
          console.log(`${requestId} INFO   ℹ️  Proposal ${i} not active (state: ${proposalState})`);
        }

        // Circuit breaker check
        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          console.log(`${requestId} WARN   🔥 Circuit breaker triggered after ${MAX_CONSECUTIVE_FAILURES} consecutive failures`);
          break;
        }

      } catch (error: any) {
        consecutiveFailures++;
        console.log(`${requestId} WARN   ⚠️ Skipped proposal ${i} due to error: ${error.message.substring(0, 50)}...`);
        
        // Circuit breaker check
        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          console.log(`${requestId} WARN   🔥 Circuit breaker triggered - stopping proposal processing`);
          break;
        }

        // Add delay before next attempt
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`${requestId} INFO   🗳️ Found ${activeProposals.length} active proposals`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: `Found ${activeProposals.length} active proposals`,
        proposals: activeProposals,
        proposalsChecked: endIndex - startIndex + 1,
        network: {
          name: (await provider.getNetwork()).name,
          chainId: (await provider.getNetwork()).chainId.toString(),
          provider: selectedProvider.name
        },
        timestamp: new Date().toISOString()
      })
    };
  } catch (error: any) {
    console.error(`${requestId} ERROR  ❌ Error details:`, {
      message: error.message,
      code: error.code,
      info: error.info,
      stack: error.stack
    });

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message,
        errorCode: error.code || 'N/A',
        timestamp: new Date().toISOString(),
        troubleshooting: 'Check Netlify function logs for detailed error information'
      })
    };
  } finally {
    console.log(`${requestId} INFO   =====================================`);
    console.log(`${requestId} INFO   ✅ Netlify Governance Agent Function finished`);
  }
};

export { handler };
