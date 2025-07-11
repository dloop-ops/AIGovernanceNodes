import { Handler } from '@netlify/functions';
import { ethers } from 'ethers';

export const handler: Handler = async (event, context) => {
  console.log('🤖 Netlify Scheduled Voting Function triggered');
  console.log('⏰ Execution time:', new Date().toISOString());
  console.log('🔧 Event type:', event.httpMethod);

  console.log('🗳️ STARTING NETLIFY SCHEDULED VOTING');
  console.log('=====================================');
  console.log('⏰ Start time:', new Date().toISOString());

  try {
    // Environment validation with detailed logging
    const rpcUrl = process.env.ETHEREUM_RPC_URL;
    console.log('🔍 Checking environment variables...');

    if (!rpcUrl) {
      throw new Error('ETHEREUM_RPC_URL environment variable is not set');
    }

    if (rpcUrl.includes('YOUR_PROJECT_ID') || rpcUrl.includes('YOUR_INFURA_KEY')) {
      throw new Error('ETHEREUM_RPC_URL contains placeholder value - please set actual Infura project ID');
    }

    // Log sanitized URL (hide the key)
    const sanitizedUrl = rpcUrl.replace(/\/v3\/.*$/, '/v3/[HIDDEN]');
    console.log('🌐 Using RPC URL:', sanitizedUrl);

    // Initialize provider with retry logic
    console.log('🔗 Connecting to Ethereum provider...');
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    // Test connection with timeout
    const networkPromise = provider.getNetwork();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Network connection timeout')), 10000)
    );

    const network = await Promise.race([networkPromise, timeoutPromise]) as any;
    console.log('✅ Connected to network:', network.name, 'Chain ID:', network.chainId.toString());

    // AssetDAO contract setup
    const assetDAOAddress = process.env.ASSET_DAO_CONTRACT_ADDRESS || '0xa87e662061237a121Ca2E83E77dA8251bc4B3529';
    console.log('📋 AssetDAO contract address:', assetDAOAddress);

    // Minimal ABI for fetching proposals
    const assetDAOAbi = [
      "function getProposalCount() external view returns (uint256)",
      "function getProposal(uint256 proposalId) external view returns (uint256 id, uint8 proposalType, address token, uint256 amount, address proposer, uint256 createdAt, uint256 votingEnds, uint256 forVotes, uint256 againstVotes, uint8 state)"
    ];

    const assetDAO = new ethers.Contract(assetDAOAddress, assetDAOAbi, provider);

    // Fetch active proposals
    console.log('📊 Fetching proposal count...');
    const proposalCount = await assetDAO.getProposalCount();
    console.log(`📊 Total proposals: ${proposalCount.toString()}`);

    const activeProposals = [];

    if (Number(proposalCount) === 0) {
      console.log('ℹ️ No proposals exist in the DAO');
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: 'No proposals exist in the DAO',
          timestamp: new Date().toISOString()
        })
      };
    }

    // Check recent proposals (last 10 or all if fewer)
    const startId = Math.max(1, Number(proposalCount) - 9);
    console.log(`🔍 Checking proposals ${startId} to ${proposalCount}...`);

    for (let i = startId; i <= Number(proposalCount); i++) {
      try {
        const proposal = await assetDAO.getProposal(i);
        console.log(`📋 Proposal ${i}: State ${proposal.state}, Type ${proposal.proposalType}`);

        // State 1 = Active
        if (proposal.state === 1) {
          activeProposals.push({
            id: proposal.id.toString(),
            proposalType: proposal.proposalType,
            token: proposal.token,
            amount: proposal.amount.toString(),
            proposer: proposal.proposer,
            votingEnds: new Date(Number(proposal.votingEnds) * 1000).toISOString()
          });
          console.log(`✅ Found active proposal ${i}`);
        }
      } catch (error) {
        console.log(`⚠️ Could not fetch proposal ${i}:`, error.message);
      }
    }

    if (activeProposals.length === 0) {
      console.log('ℹ️ No active proposals found');
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: 'No active proposals to vote on',
          proposalsChecked: Number(proposalCount),
          timestamp: new Date().toISOString()
        })
      };
    }

    console.log(`🗳️ Found ${activeProposals.length} active proposals`);

    // TODO: Add voting logic here with private keys
    // For now, just log the proposals found
    activeProposals.forEach(proposal => {
      console.log(`📋 Proposal ${proposal.id}: Type ${proposal.proposalType}, Amount: ${proposal.amount}`);
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: `Found ${activeProposals.length} active proposals`,
        proposals: activeProposals,
        network: {
          name: (network as any).name,
          chainId: (network as any).chainId.toString()
        },
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      info: error.info
    });

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message,
        errorCode: error.code,
        timestamp: new Date().toISOString()
      })
    };
  }
};