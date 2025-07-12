import { Handler, schedule } from '@netlify/functions';
import { ethers } from 'ethers';

// 🗳️ NETLIFY SCHEDULED VOTING FUNCTION
// Runs every 30 minutes to check for and vote on new proposals

interface Proposal {
  id: string;
  proposer: string;
  proposalType: number;
  state: number;
  assetAddress: string;
  amount: string;
  description: string;
  votesFor: string;
  votesAgainst: string;
  startTime: number;
  endTime: number;
  executed: boolean;
  cancelled: boolean;
}

class NetlifyVotingService {
  private provider: ethers.JsonRpcProvider;
  private wallets: ethers.Wallet[] = [];
  private assetDaoContract: ethers.Contract;

  constructor() {
    // Initialize provider
    const rpcUrl = process.env.ETHEREUM_RPC_URL || 'https://sepolia.infura.io/v3/YOUR_PROJECT_ID';
    this.provider = new ethers.JsonRpcProvider(rpcUrl);

    // Initialize wallets
    this.initializeWallets();

    // Initialize contract
    const assetDaoAddress = process.env.ASSET_DAO_CONTRACT_ADDRESS || '0xa87e662061237a121Ca2E83E77dA8251bc4B3529';
    const assetDaoAbi = [
      "function getProposalCount() view returns (uint256)",
      "function getProposal(uint256) view returns (uint256, uint8, address, uint256, string, address, uint256, uint256, uint256, uint256, uint8, bool)",
      "function vote(uint256 proposalId, bool support) external",
      "function hasVoted(uint256 proposalId, address voter) view returns (bool)"
    ];
    
    this.assetDaoContract = new ethers.Contract(assetDaoAddress, assetDaoAbi, this.provider);
  }

  private initializeWallets(): void {
    for (let i = 1; i <= 5; i++) {
      const privateKey = process.env[`AI_NODE_${i}_PRIVATE_KEY`];
      if (privateKey) {
        let normalizedKey = privateKey.trim();
        if (!normalizedKey.startsWith('0x')) {
          normalizedKey = '0x' + normalizedKey;
        }
        const wallet = new ethers.Wallet(normalizedKey, this.provider);
        this.wallets.push(wallet);
      }
    }
  }

  async getActiveProposals(): Promise<Proposal[]> {
    try {
      const count = await this.assetDaoContract.getProposalCount();
      const totalCount = Number(count);
      const startFrom = Math.max(1, totalCount - 19); // Check last 20 proposals
      
      console.log(`📊 Checking proposals ${startFrom}-${totalCount} for active ones...`);
      
      const activeProposals: Proposal[] = [];
      
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
          console.log(`   ❌ Error checking proposal ${i}:`, error);
        }
      }
      
      return activeProposals;
    } catch (error) {
      console.error('❌ Failed to fetch proposals:', error);
      return [];
    }
  }

  makeVotingDecision(proposal: Proposal): { vote: boolean; support: boolean } {
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

  async hasVoted(proposalId: string, walletIndex: number): Promise<boolean> {
    try {
      const wallet = this.wallets[walletIndex];
      if (!wallet) return false;
      
      return await this.assetDaoContract.hasVoted(proposalId, wallet.address);
    } catch (error) {
      console.error(`Error checking vote status for wallet ${walletIndex}:`, error);
      return false;
    }
  }

  async castVote(proposalId: string, walletIndex: number, support: boolean): Promise<string> {
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
      throw new Error(`Failed to vote: ${error}`);
    }
  }

  async processVoting(): Promise<{ totalVotes: number; results: any[] }> {
    console.log('🗳️ STARTING NETLIFY SCHEDULED VOTING');
    console.log('=====================================');
    console.log(`⏰ Start time: ${new Date().toISOString()}`);

    // Get active proposals with timeout
    const proposals = await Promise.race([
      this.getActiveProposals(),
      new Promise<any[]>((_, reject) => 
        setTimeout(() => reject(new Error('getActiveProposals timeout')), 15000)
      )
    ]);
    
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
          
          // Cast vote with timeout
          const txHash = await Promise.race([
            this.castVote(proposal.id, nodeIndex, shouldVote.support),
            new Promise<string>((_, reject) => 
              setTimeout(() => reject(new Error('Vote transaction timeout')), 30000)
            )
          ]);
          console.log(`      ✅ Vote cast: ${txHash.slice(0, 10)}...`);
          totalVotes++;
          
          proposalResults.votes.push({ 
            nodeIndex: nodeIndex + 1, 
            status: 'success', 
            txHash: txHash.slice(0, 10) + '...' 
          });
          
          // Delay between nodes to avoid rate limiting
          if (nodeIndex < 4) {
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
          
        } catch (error) {
          console.error(`      ❌ Failed to vote:`, error);
          proposalResults.votes.push({ 
            nodeIndex: nodeIndex + 1, 
            status: 'failed', 
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
      
      results.push(proposalResults);
    }

    console.log(`\n📊 NETLIFY VOTING SUMMARY`);
    console.log(`   📝 Total votes cast: ${totalVotes}`);
    
    return { totalVotes, results };
  }
}

// Netlify scheduled function handler
const scheduledHandler: Handler = async (event, context) => {
  console.log('🤖 Netlify Scheduled Voting Function triggered');
  console.log(`⏰ Execution time: ${new Date().toISOString()}`);
  console.log(`🔧 Event type: ${event.httpMethod || 'scheduled'}`);

  try {
    // Initialize voting service
    const votingService = new NetlifyVotingService();
    
    // Process voting
    const results = await votingService.processVoting();
    
    // Return success response
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        message: 'Scheduled voting completed successfully',
        totalVotes: results.totalVotes,
        results: results.results,
        executionTime: new Date().toISOString()
      }, null, 2)
    };

  } catch (error) {
    console.error('❌ Scheduled voting failed:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
        message: 'Scheduled voting failed'
      }, null, 2)
    };
  }
};

// Export the scheduled handler with cron schedule
export const handler = schedule('*/30 * * * *', scheduledHandler); // Every 30 minutes 