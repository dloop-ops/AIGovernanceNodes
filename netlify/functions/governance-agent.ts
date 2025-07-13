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

    // Contract setup with enhanced address validation and checksum correction
    const rawAssetDAOAddress = process.env.ASSET_DAO_CONTRACT_ADDRESS || '0xa87e662061237a121Ca2E83E77dA8C251bc4B3529';
    
    // Enhanced address validation with proper checksum handling
    let assetDAOAddress: string;
    try {
      // First, clean the address
      const trimmedAddress = rawAssetDAOAddress.trim();
      
      console.log(`${requestId} DEBUG  🔍 Validating address: "${trimmedAddress}" (length: ${trimmedAddress.length})`);
      
      // Validate basic format - check actual requirements
      if (!trimmedAddress || !trimmedAddress.startsWith('0x')) {
        throw new Error(`Address must start with 0x`);
      }
      
      if (trimmedAddress.length !== 42) {
        throw new Error(`Address must be exactly 42 characters long, got ${trimmedAddress.length}`);
      }
      
      // Validate hex characters (case-insensitive) - only the part after 0x should be hex
      const hexPart = trimmedAddress.slice(2); // Remove '0x' prefix
      const hexPattern = /^[a-fA-F0-9]{40}$/;
      if (!hexPattern.test(hexPart)) {
        throw new Error(`Address contains invalid hex characters`);
      }
      
      // Use ethers.getAddress for checksum validation and normalization
      // This will automatically handle case conversion and checksumming
      assetDAOAddress = ethers.getAddress(trimmedAddress);
      console.log(`${requestId} INFO   ✅ Contract address validated and checksummed: ${assetDAOAddress}`);
    } catch (addressError: any) {
      console.log(`${requestId} ERROR  ❌ Address validation failed for: "${rawAssetDAOAddress}"`);
      console.log(`${requestId} ERROR  ❌ Validation error: ${addressError.message}`);
      
      // If ethers.getAddress fails, try direct usage (it might be a checksum issue)
      try {
        console.log(`${requestId} INFO   🔄 Attempting direct ethers.getAddress on raw input...`);
        assetDAOAddress = ethers.getAddress(rawAssetDAOAddress.trim());
        console.log(`${requestId} INFO   ✅ Direct validation successful: ${assetDAOAddress}`);
      } catch (fallbackError: any) {
        console.log(`${requestId} ERROR  ❌ All validation attempts failed`);
        throw new Error(`Invalid AssetDAO contract address: ${addressError.message}`);
      }
    }

    const assetDAOABI = [
      "function getProposalCount() external view returns (uint256)",
      "function getProposal(uint256) external view returns (uint256, uint8, address, uint256, string, address, uint256, uint256, uint256, uint256, uint8, bool)"
    ];

    const contract = new ethers.Contract(assetDAOAddress, assetDAOABI, provider);

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

    // Check last 25 proposals to find active ones (expanded range)
    const startIndex = Math.max(1, totalProposals - 24);
    const endIndex = totalProposals;
    const activeProposals = [];

    console.log(`${requestId} INFO   🔍 Checking proposals ${startIndex} to ${endIndex} (expanded range)...`);

    // Process proposals sequentially with strict time limits
    for (let i = startIndex; i <= endIndex; i++) {
      try {
        const proposalData = await callContractWithRetry(() => contract.getProposal(i), 2);

        // Enhanced validation - check if proposal data is valid
        if (!proposalData || proposalData.length < 12) {
          console.log(`${requestId} WARN   ⚠️ Proposal ${i} has invalid data structure - skipping`);
          continue;
        }

        const proposer = proposalData[2];

        // Quick validation - check if proposer is zero address
        if (!proposer || proposer === '0x0000000000000000000000000000000000000000') {
          console.log(`${requestId} WARN   ⚠️ Proposal ${i} has zero address proposer - skipping`);
          continue;
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
            activeProposals.push({
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
            });
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
      } catch (error: any) {
        console.log(`${requestId} WARN   ⚠️ Skipped proposal ${i} due to error: ${error.message.substring(0, 50)}...`);
        // Optionally add a short delay before processing the next proposal
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`${requestId} INFO   🗳️ Found ${activeProposals.length} active proposals`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: `Found ${activeProposals.length} active proposals`,
        proposals: activeProposals,
        network: {
          name: (await provider.getNetwork()).name,
          chainId: (await provider.getNetwork()).chainId.toString(),
          provider: selectedProvider.name
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