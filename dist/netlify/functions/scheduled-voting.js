const { ethers } = require('ethers');

// CRITICAL FIX: Enhanced Proposal Data Parsing for AssetDAO Contract
async function getActiveProposals() {
  console.log('🔍 Fetching active proposals...');

  try {
    // Initialize provider with multiple fallbacks
    const rpcUrls = [
      process.env.ETHEREUM_RPC_URL,
      'https://sepolia.infura.io/v3/ca485bd6567e4c5fb5693ee66a5885d8',
      'https://rpc.sepolia.org',
      'https://eth-sepolia.public.blastapi.io'
    ].filter(Boolean);

    let provider;
    for (const url of rpcUrls) {
      try {
        provider = new ethers.JsonRpcProvider(url);
        await provider.getBlockNumber(); // Test connection
        console.log(`✅ Connected using: ${url.substring(0, 50)}...`);
        break;
      } catch (error) {
        console.log(`❌ Failed to connect to: ${url.substring(0, 50)}...`);
        continue;
      }
    }

    if (!provider) {
      throw new Error('Failed to connect to any RPC provider');
    }

    // AssetDAO contract details
    const assetDAOAddress = '0xa87e662061237a121ca2e83e77da8251bc4b3529';
    const assetDAOABI = [
      "function getProposalCount() external view returns (uint256)",
      "function getProposal(uint256) external view returns (uint256, uint8, address, uint256, string, address, uint256, uint256, uint256, uint256, uint8, bool)",
      "function proposals(uint256) external view returns (uint256, uint8, address, uint256, string, address, uint256, uint256, uint256, uint256, uint8, bool)"
    ];

    const contract = new ethers.Contract(assetDAOAddress, assetDAOABI, provider);
    const currentTime = Math.floor(Date.now() / 1000);

    // Get total proposal count
    const totalCount = await contract.getProposalCount();
    console.log(`📊 Total proposals: ${totalCount}`);

    const activeProposals = [];
    const checkCount = Math.min(50, Number(totalCount));
    const startFrom = Math.max(1, Number(totalCount) - checkCount + 1);

    console.log(`🔍 Checking proposals ${startFrom} to ${totalCount}...`);

    for (let i = startFrom; i <= Number(totalCount); i++) {
      try {
        let proposalData;
        try {
          proposalData = await contract.proposals(i);
        } catch (error) {
          console.log(`❌ proposals(${i}) failed, trying getProposal:`, error.message);
          proposalData = await contract.getProposal(i);
        }

        // CRITICAL FIX: Search for valid timestamps instead of assuming fixed indices
        const state = Number(proposalData[1]); // state at index 1
        const proposer = proposalData[2];      // proposer at index 2
        const description = proposalData[4] || `Proposal ${i}`; // description at index 4
        
        let foundStartTime = 0;
        let foundEndTime = 0;
        const currentTimeSec = Math.floor(Date.now() / 1000);
        
        // Search through all fields for valid timestamps
        for (let idx = 0; idx < proposalData.length; idx++) {
          const value = typeof proposalData[idx] === 'bigint' ? Number(proposalData[idx]) : Number(proposalData[idx]);
          
          // Skip zero and obviously invalid values
          if (value === 0 || value < 1000000000) continue;
          
          // Convert from milliseconds if needed
          const asSeconds = value > currentTimeSec * 1000 ? Math.floor(value / 1000) : value;
          
          // Check if it's a reasonable timestamp (between 2020 and 2030)
          const year2020 = 1577836800;
          const year2030 = 1893456000;
          
          if (asSeconds >= year2020 && asSeconds <= year2030) {
            if (foundStartTime === 0) {
              foundStartTime = asSeconds;
              console.log(`📅 Found startTime at index ${idx}: ${foundStartTime}`);
            } else if (foundEndTime === 0 && asSeconds !== foundStartTime) {
              foundEndTime = asSeconds;
              console.log(`📅 Found endTime at index ${idx}: ${foundEndTime}`);
            }
          }
        }
        
        const normalizedStartTime = foundStartTime;
        const normalizedEndTime = foundEndTime;

        const proposal = {
          id: i.toString(),
          proposer: proposer,
          description: description,
          startTime: normalizedStartTime,
          endTime: normalizedEndTime,
          state: state,
          executed: Boolean(proposalData[11])
        };

        console.log(`📊 Proposal ${i} state: ${state}`);
        console.log(`🕐 Proposal ${i} - Raw endTime: ${rawEndTime}, Normalized: ${normalizedEndTime}, Current: ${currentTime}`);

        // Enhanced validation for active proposals
        const isValidProposer = proposer !== '0x0000000000000000000000000000000000000000';
        const isActiveState = state === 1; // State 1 = Active
        const isNotExpired = normalizedEndTime > currentTime;
        const hasValidEndTime = normalizedEndTime > 0;

        if (isValidProposer && isActiveState && isNotExpired && hasValidEndTime) {
          activeProposals.push(proposal);
          const timeLeft = normalizedEndTime - currentTime;
          const hoursLeft = Math.floor(timeLeft / 3600);
          console.log(`✅ Found active proposal ${i} with ${hoursLeft}h remaining`);
        } else {
          let reason = 'Unknown';
          if (!isValidProposer) reason = 'Invalid proposer';
          else if (!isActiveState) reason = `State ${state}`;
          else if (!hasValidEndTime) reason = 'Invalid end time (0)';
          else if (!isNotExpired) {
            const expiredSeconds = currentTime - normalizedEndTime;
            reason = `Expired ${expiredSeconds}s ago`;
          }
          console.log(`⏰ Skipped proposal ${i} - ${reason}`);
        }

      } catch (error) {
        console.log(`❌ Error processing proposal ${i}:`, error.message);
        continue;
      }
    }

    console.log(`ℹ️  Found ${activeProposals.length} active proposals`);
    return activeProposals;

  } catch (error) {
    console.error('❌ Error fetching proposals:', error);
    throw error;
  }
}

// Netlify Functions handler
exports.handler = async (event, context) => {
  console.log('🤖 Netlify Scheduled Voting Function triggered');

  try {
    const activeProposals = await getActiveProposals();

    if (activeProposals.length === 0) {
      console.log('ℹ️  No active proposals found');
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: 'No active proposals found',
          proposals: [],
          timestamp: new Date().toISOString()
        })
      };
    }

    console.log(`🗳️  Processing ${activeProposals.length} active proposals...`);

    // TODO: Implement actual voting logic here
    for (const proposal of activeProposals) {
      console.log(`🗳️  Would vote on proposal ${proposal.id}: ${proposal.description}`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: `Processed ${activeProposals.length} active proposals`,
        proposals: activeProposals,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('❌ Scheduled voting failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message,
        message: 'Scheduled voting failed'
      }, null, 2)
    };
  }
};