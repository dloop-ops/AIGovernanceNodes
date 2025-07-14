import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { ethers } from 'ethers';

// AI Node private keys for voting
const AI_NODE_KEYS = [
  process.env.AI_NODE_1_PRIVATE_KEY,
  process.env.AI_NODE_2_PRIVATE_KEY,
  process.env.AI_NODE_3_PRIVATE_KEY,
  process.env.AI_NODE_4_PRIVATE_KEY,
  process.env.AI_NODE_5_PRIVATE_KEY
].filter(key => key && key.length > 0);

// Voting tracking to prevent double voting
const votingHistory = new Map<string, Set<string>>();

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  const requestId = Math.random().toString(36).substring(7);

  console.log(`${requestId} INFO   🤖 Netlify Scheduled Voting Function triggered`);
  console.log(`${requestId} INFO   ⏰ Execution time: ${new Date().toISOString()}`);

  try {
    if (AI_NODE_KEYS.length === 0) {
      throw new Error('No AI node private keys configured');
    }

    console.log(`${requestId} INFO   🔑 Found ${AI_NODE_KEYS.length} AI node keys`);

    // Initialize RPC providers with enhanced error handling
    const providers = [
      'https://sepolia.infura.io/v3/ca485bd6567e4c5fb5693ee66a5885d8',
      'https://ethereum-sepolia-rpc.publicnode.com',
      'https://rpc.sepolia.org'
    ];

    let provider: ethers.JsonRpcProvider | null = null;

    for (const rpcUrl of providers) {
      try {
        const testProvider = new ethers.JsonRpcProvider(rpcUrl);
        await testProvider.getNetwork();
        provider = testProvider;
        console.log(`${requestId} INFO   ✅ Connected to RPC: ${rpcUrl.substring(0, 30)}...`);
        break;
      } catch (error) {
        console.log(`${requestId} WARN   ⚠️ RPC failed: ${rpcUrl.substring(0, 30)}...`);
      }
    }

    if (!provider) {
      throw new Error('All RPC providers failed');
    }

    // Contract setup with proper address validation
    const assetDaoAddress = ethers.getAddress(
      process.env.ASSET_DAO_CONTRACT_ADDRESS || '0xa87e662061237a121Ca2E83E77dA8C251bc4B3529'
    );

    const assetDaoAbi = [
      "function getProposalCount() external view returns (uint256)",
      "function getProposal(uint256) external view returns (uint256, uint8, address, uint256, string, address, uint256, uint256, uint256, uint256, uint8, bool)",
      "function hasVoted(uint256, address) external view returns (bool)",
      "function vote(uint256, bool) external returns (bool)"
    ];

    const contract = new ethers.Contract(assetDaoAddress, assetDaoAbi, provider);

    // Get active proposals
    const proposalCount = Number(await contract.getProposalCount());
    console.log(`${requestId} INFO   📊 Total proposals: ${proposalCount}`);

    if (proposalCount === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: 'No proposals to vote on',
          timestamp: new Date().toISOString()
        })
      };
    }

    const votingResults = [];
    const currentTime = Math.floor(Date.now() / 1000);

    // Check last 5 proposals for active ones
    const startIndex = Math.max(1, proposalCount - 4);

    for (let proposalId = startIndex; proposalId <= proposalCount; proposalId++) {
      try {
        // Add delay between proposal checks
        if (proposalId > startIndex) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        const proposalData = await contract.getProposal(proposalId);

        if (!proposalData || proposalData.length < 12) {
          console.log(`${requestId} WARN   ⚠️ Invalid proposal data for ${proposalId}`);
          continue;
        }

        const proposalState = Number(proposalData[10]);

        // Only process active proposals (state = 1)
        if (proposalState !== 1) {
          console.log(`${requestId} INFO   ⏭️  Proposal ${proposalId} not active (state: ${proposalState})`);
          continue;
        }

        // Validate end time
        const endTime = Number(proposalData[9]);
        if (endTime > 0 && endTime <= currentTime) {
          console.log(`${requestId} INFO   ⏰ Proposal ${proposalId} voting period expired`);
          continue;
        }

        console.log(`${requestId} INFO   🗳️ Processing active proposal ${proposalId}`);

        // Vote with each AI node
        for (let nodeIndex = 0; nodeIndex < AI_NODE_KEYS.length; nodeIndex++) {
          try {
            const wallet = new ethers.Wallet(AI_NODE_KEYS[nodeIndex], provider);

            // Check if this node has already voted
            const hasVoted = await contract.hasVoted(proposalId, wallet.address);

            if (hasVoted) {
              console.log(`${requestId} INFO   ✅ Node ${nodeIndex + 1} already voted on proposal ${proposalId}`);
              continue;
            }

            // Add delay between votes to prevent rate limiting
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Make voting decision (simplified strategy)
            const voteSupport = nodeIndex % 2 === 0; // Alternate votes for testing

            // Execute vote
            const contractWithSigner = contract.connect(wallet);
            const tx = await contractWithSigner.vote(proposalId, voteSupport, {
              gasLimit: 150000,
              gasPrice: ethers.parseUnits('20', 'gwei')
            });

            console.log(`${requestId} INFO   🗳️ Node ${nodeIndex + 1} voted ${voteSupport ? 'YES' : 'NO'} on proposal ${proposalId}`);
            console.log(`${requestId} INFO   📝 Transaction: ${tx.hash}`);

            votingResults.push({
              proposalId,
              nodeIndex: nodeIndex + 1,
              nodeAddress: wallet.address,
              vote: voteSupport ? 'YES' : 'NO',
              txHash: tx.hash
            });

          } catch (voteError: any) {
            console.log(`${requestId} ERROR ❌ Node ${nodeIndex + 1} vote failed: ${voteError.message}`);

            votingResults.push({
              proposalId,
              nodeIndex: nodeIndex + 1,
              error: voteError.message.substring(0, 100)
            });
          }
        }

      } catch (proposalError: any) {
        console.log(`${requestId} ERROR ❌ Failed to process proposal ${proposalId}: ${proposalError.message}`);
      }
    }

    console.log(`${requestId} INFO   ✅ Voting round completed`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: `Processed voting for ${votingResults.length} votes`,
        votingResults,
        proposalsChecked: proposalCount - startIndex + 1,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error: any) {
    console.error(`${requestId} ERROR ❌ Scheduled voting failed:`, {
      message: error.message,
      stack: error.stack
    });

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};

export { handler };