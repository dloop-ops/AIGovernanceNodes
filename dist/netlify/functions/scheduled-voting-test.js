import { ethers } from 'ethers';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// 🗳️ LOCAL TEST VERSION OF NETLIFY SCHEDULED VOTING FUNCTION
// This version can be run locally for testing without Netlify dependencies

class NetlifyVotingService {
  constructor() {
    // Initialize provider
    const rpcUrl = process.env.ETHEREUM_RPC_URL || 'https://sepolia.infura.io/v3/YOUR_PROJECT_ID';
    this.provider = new ethers.JsonRpcProvider(rpcUrl);

    // Initialize wallets
    this.wallets = [];
    this.initializeWallets();

    // Initialize contract
    const assetDaoAddress = process.env.ASSET_DAO_CONTRACT_ADDRESS || '0xa87e662061237a121Ca2E83E77dA8C251bc4B352';
    const assetDaoAbi = [
      "function getProposalCount() view returns (uint256)",
      "function getProposal(uint256) view returns (uint256, uint8, address, uint256, string, address, uint256, uint256, uint256, uint256, uint8, bool)",
      "function vote(uint256 proposalId, bool support) external",
      "function hasVoted(uint256 proposalId, address voter) view returns (bool)"
    ];

    this.assetDaoContract = new ethers.Contract(assetDaoAddress, assetDaoAbi, this.provider);
  }

  initializeWallets() {
    for (let i = 1; i <= 5; i++) {
      const privateKey = process.env[`AI_NODE_${i}_PRIVATE_KEY`];
      if (privateKey) {
        let normalizedKey = privateKey.trim();
        if (!normalizedKey.startsWith('0x')) {
          normalizedKey = '0x' + normalizedKey;
        }
        const wallet = new ethers.Wallet(normalizedKey, this.provider);
        this.wallets.push(wallet);
        console.log(`✅ Initialized wallet ${i}: ${wallet.address.slice(0, 10)}...`);
      } else {
        console.log(`❌ Missing private key for AI_NODE_${i}_PRIVATE_KEY`);
      }
    }
    console.log(`📊 Total wallets initialized: ${this.wallets.length}/5`);
  }

  async getActiveProposals() {
    try {
      const count = await this.assetDaoContract.getProposalCount();
      const totalCount = Number(count);
      const startFrom = Math.max(1, totalCount - 19); // Check last 20 proposals

      console.log(`📊 Checking proposals ${startFrom}-${totalCount} for active ones...`);

      const activeProposals = [];

      for (let i = startFrom; i <= totalCount; i++) {
        try {
          const proposalData = await this.assetDaoContract.getProposal(i);
          const state = proposalData[10];

          if (Number(state) === 1) { // ACTIVE
            const currentTime = Math.floor(Date.now() / 1000);
            const votingEnds = Number(proposalData[7]);
            const timeLeft = votingEnds - currentTime;

            if (timeLeft > 0) {
              activeProposals.push({
                id: i.toString(),
                proposer: proposalData[2],
                proposalType: proposalData[1],
                state: 1,
                assetAddress: proposalData[5],
                amount: ethers.formatEther(proposalData[6]),
                description: proposalData[4],
                votesFor: "0",
                votesAgainst: "0",
                startTime: Number(proposalData[8]),
                endTime: votingEnds,
                executed: false,
                cancelled: false
              });
              console.log(`   ✅ Found VALID active proposal ${i} (${Math.floor(timeLeft/3600)}h left)`);
            } else {
              console.log(`   ⏰ Skipped proposal ${i} - voting period expired ${Math.abs(timeLeft)}s ago`);
            }
          }
        } catch (error) {
          console.log(`   ❌ Error checking proposal ${i}:`, error.message);
        }
      }

      return activeProposals;
    } catch (error) {
      console.error('❌ Failed to fetch proposals:', error.message);
      return [];
    }
  }

  makeVotingDecision(proposal) {
    const isUSDC = proposal.assetAddress.toLowerCase().includes('1c7d4b196cb0c7b01d743fbc6116a902379c7238');
    const amount = parseFloat(proposal.amount);

    console.log(`   🔍 Asset analysis: ${proposal.assetAddress.slice(0, 12)}... (USDC: ${isUSDC})`);
    console.log(`   💰 Amount analysis: ${amount} ETH (${amount} threshold)`);

    // For testing: vote on all small proposals (not just USDC)
    if (amount <= 1) { // Very small amount in ETH
      console.log(`   ✅ Small amount proposal - voting YES`);
      return { vote: true, support: true };
    }

    // Conservative approach: vote on small USDC proposals
    if (isUSDC && amount <= 5000) {
      console.log(`   ✅ USDC proposal under threshold - voting YES`);
      return { vote: true, support: true };
    }

    console.log(`   ❌ Proposal doesn't meet criteria (amount too large or risky asset)`);
    return { vote: false, support: false };
  }

  async hasVoted(proposalId, walletIndex) {
    try {
      const wallet = this.wallets[walletIndex];
      if (!wallet) return false;

      return await this.assetDaoContract.hasVoted(proposalId, wallet.address);
    } catch (error) {
      console.error(`Error checking vote status for wallet ${walletIndex}:`, error.message);
      return false;
    }
  }

  async castVote(proposalId, walletIndex, support) {
    const wallet = this.wallets[walletIndex];
    if (!wallet) {
      throw new Error(`Wallet ${walletIndex} not found`);
    }

    const contractWithSigner = this.assetDaoContract.connect(wallet);

    try {
      const tx = await contractWithSigner.vote(proposalId, support);
      await tx.wait();
      return tx.hash;
    } catch (error) {
      throw new Error(`Failed to vote: ${error.message}`);
    }
  }

  async processVoting() {
    console.log('🗳️ STARTING LOCAL TEST OF NETLIFY SCHEDULED VOTING');
    console.log('===================================================');
    console.log(`⏰ Start time: ${new Date().toISOString()}`);

    // Get active proposals
    const proposals = await this.getActiveProposals();

    if (proposals.length === 0) {
      console.log('ℹ️  No active proposals found');
      return { totalVotes: 0, results: [] };
    }

    console.log(`📋 Found ${proposals.length} active proposals`);

    let totalVotes = 0;
    const results = [];

    for (const proposal of proposals) {
      console.log(`\n📋 Processing Proposal ${proposal.id}`);
      console.log(`   💰 Amount: ${proposal.amount} ETH`);
      console.log(`   📍 Asset: ${proposal.assetAddress.slice(0, 10)}...`);

      // Determine voting decision
      const shouldVote = this.makeVotingDecision(proposal);

      if (!shouldVote.vote) {
        console.log(`   ⏭️  Skipping proposal ${proposal.id} (doesn't meet voting criteria)`);
        continue;
      }

      console.log(`   🎯 Decision: Vote ${shouldVote.support ? 'YES' : 'NO'} on proposal ${proposal.id}`);

      const proposalResults = {
        proposalId: proposal.id,
        decision: shouldVote.support ? 'YES' : 'NO',
        votes: []
      };

      // Vote with each of the 5 nodes
      for (let nodeIndex = 0; nodeIndex < 5; nodeIndex++) {
        const nodeId = `ai-gov-${String(nodeIndex + 1).padStart(2, '0')}`;
        const nodeAddress = this.wallets[nodeIndex]?.address || 'N/A';

        console.log(`\n   🤖 Node ${nodeIndex + 1} (${nodeId}): ${nodeAddress.slice(0, 10)}...`);

        try {
          // Check if this node has already voted
          const hasVoted = await this.hasVoted(proposal.id, nodeIndex);

          if (hasVoted) {
            console.log(`      ℹ️  Already voted`);
            proposalResults.votes.push({ nodeIndex: nodeIndex + 1, status: 'already_voted' });
            continue;
          }

          // Cast vote
          const txHash = await this.castVote(proposal.id, nodeIndex, shouldVote.support);
          console.log(`      ✅ Vote cast: ${txHash.slice(0, 10)}...`);
          totalVotes++;

          proposalResults.votes.push({ 
            nodeIndex: nodeIndex + 1, 
            status: 'success', 
            txHash: txHash.slice(0, 10) + '...' 
          });

          // Delay between nodes to avoid rate limiting
          if (nodeIndex < 4) {
            console.log(`      ⏱️  Waiting 3 seconds before next node...`);
            await new Promise(resolve => setTimeout(resolve, 3000));
          }

        } catch (error) {
          console.error(`      ❌ Failed to vote:`, error.message);
          proposalResults.votes.push({ 
            nodeIndex: nodeIndex + 1, 
            status: 'failed', 
            error: error.message || String(error)
          });
        }
      }

      results.push(proposalResults);
    }

    console.log(`\n📊 LOCAL TEST SUMMARY`);
    console.log(`   📝 Total votes cast: ${totalVotes}`);
    console.log(`   ⏰ Execution time: ${new Date().toISOString()}`);

    return { totalVotes, results };
  }
}

// Main execution function
async function testScheduledVoting() {
  console.log('🧪 LOCAL TEST: Netlify Scheduled Voting Function');
  console.log('=================================================');

  try {
    // Initialize voting service
    const votingService = new NetlifyVotingService();

    // Process voting
    const results = await votingService.processVoting();

    // Print results
    console.log('\n✅ TEST COMPLETED SUCCESSFULLY');
    console.log(`📊 Results: ${JSON.stringify(results, null, 2)}`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testScheduledVoting();