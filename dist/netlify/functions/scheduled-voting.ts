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
    // Initialize provider with multiple RPC endpoints for redundancy
    const rpcUrls = [
      process.env.ETHEREUM_RPC_URL || 'https://sepolia.infura.io/v3/YOUR_PROJECT_ID',
      'https://ethereum-sepolia-rpc.publicnode.com',
      'https://rpc.sepolia.org',
      'https://sepolia.gateway.tenderly.co'
    ];

    // Use the primary RPC URL
    this.provider = new ethers.JsonRpcProvider(rpcUrls[0]);

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

  private async retryWithBackoff<T>(operation: () => Promise<T>, maxRetries: number = 3): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;

        // Check if it's a rate limiting error
        if (error.code === 'BAD_DATA' && error.message?.includes('Too Many Requests')) {
          const backoffMs = Math.min(2000 * Math.pow(2, attempt), 30000); // Exponential backoff, max 30s
          console.log(`⏳ Rate limited (attempt ${attempt}/${maxRetries}), waiting ${backoffMs}ms...`);

          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, backoffMs));
            continue;
          }
        }

        // For non-rate-limiting errors, don't retry
        throw error;
      }
    }

    throw lastError;
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
      // Add initial delay to avoid immediate rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Set timeout for getting proposal count with retry logic
      const count = await this.retryWithBackoff(async () => {
        return await Promise.race([
          this.assetDaoContract.getProposalCount(),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Proposal count timeout')), 10000)
          )
        ]);
      });

      const totalCount = Number(count);
      const startFrom = Math.max(1, totalCount - 5); // Check last 5 proposals only to reduce load

      console.log(`📊 Checking proposals ${startFrom}-${totalCount} for active ones...`);

      const activeProposals: Proposal[] = [];

      // Process proposals sequentially with longer delays to avoid rate limiting
      for (let i = startFrom; i <= totalCount; i++) {
        try {
          // Add progressive delay between requests to avoid rate limiting
          const delayMs = 3000 + (i - startFrom) * 1000; // Start at 3s, increase by 1s per proposal
          if (i > startFrom) {
            console.log(`⏳ Waiting ${delayMs}ms to avoid rate limiting...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }

          const proposalData = await this.retryWithBackoff(async () => {
            return await Promise.race([
              this.assetDaoContract.getProposal(i),
              new Promise<never>((_, reject) => 
                setTimeout(() => reject(new Error('Proposal fetch timeout')), 15000)
              )
            ]);
          });

          // Validate proposal data structure
          if (!proposalData || proposalData.length < 12) {
            console.log(`   ⚠️  Proposal ${i} has invalid data structure - skipping`);
            continue;
          }

          // Validate proposal data structure first
          if (!proposalData || proposalData.length < 12) {
            console.log(`   ⚠️  Proposal ${i} has invalid data structure - skipping`);
            continue;
          }

          // Use the same field mapping as the working diagnostic script
          const proposalState = Number(proposalData[10]);  // Correct field index for state
          const votingEnds = Number(proposalData[7]);       // Correct field index for end time

          // Validate that state is properly defined
          if (typeof proposalState === 'undefined' || isNaN(proposalState)) {
            console.log(`   ⚠️  Proposal ${i} has undefined or invalid state - skipping`);
            continue;
          }

          if (proposalState === 1) { // ACTIVE
            const currentTime = Math.floor(Date.now() / 1000);

            const timeLeft = votingEnds - currentTime;

            if (timeLeft > 0) {
              activeProposals.push({
                id: i.toString(),
                proposer: proposalData[5] || proposalData[2],
                proposalType: Number(proposalData[1]) || 0,
                state: proposalState,
                assetAddress: proposalData[2] || proposalData[5],
                amount: proposalData[3] ? proposalData[3].toString() : '0',
                description: proposalData[4] || `Proposal ${i}`,
                votesFor: proposalData[8] ? proposalData[8].toString() : '0',
                votesAgainst: proposalData[9] ? proposalData[9].toString() : '0',
                startTime: Number(proposalData[6]) || 0,
                endTime: votingEnds,
                executed: false,
                cancelled: false
              });

              const hoursLeft = Math.floor(timeLeft / 3600);
              const daysLeft = Math.floor(hoursLeft / 24);
              const timeLeftStr = daysLeft > 0 ? `${daysLeft}d ${hoursLeft % 24}h` : `${hoursLeft}h`;

              console.log(`   ✅ Found ACTIVE proposal ${i} (${timeLeftStr} remaining)`);
            } else {
              const expiredTime = Math.abs(timeLeft);
              const expiredHours = Math.floor(expiredTime / 3600);
              const expiredDays = Math.floor(expiredHours / 24);
              const expiredStr = expiredDays > 0 ? `${expiredDays}d ${expiredHours % 24}h` : `${expiredHours}h`;

              console.log(`   ⏰ Skipped proposal ${i} - voting period expired ${expiredStr} ago`);
            }
          }
        } catch (error) {
          console.log(`   ❌ Error checking proposal ${i}:`, error instanceof Error ? error.message.substring(0, 50) : 'Unknown error');

          // If rate limited, add extra delay
          if (error instanceof Error && error.message.includes('Too Many Requests')) {
            console.log(`   ⏸️  Rate limited, adding 3 second delay...`);
            await new Promise(resolve => setTimeout(resolve, 3000));
          }

          // Continue to next proposal instead of breaking
        }
      }

      return activeProposals;
    } catch (error) {
      console.error('❌ Failed to fetch proposals:', error);
      return [];
    }
  }

  makeVotingDecision(proposal: Proposal): { vote: boolean; support: boolean } {
    // Check for USDC-related proposals by description and asset address
    const isUSDCProposal = proposal.description.toLowerCase().includes('usdc') || 
                          proposal.assetAddress.toLowerCase().includes('1c7d4b196cb0c7b01d743fbc6116a902379c7238') ||
                          proposal.assetAddress.toLowerCase().includes('37d5cfe5f3d8b8be80ee7e521949daefac692a67') ||
                          proposal.assetAddress.toLowerCase().includes('3639d1f746a977775522221f53d0b1ea5749b8b9');

    const amount = parseFloat(proposal.amount);
    const amountInUSDC = amount / 1000000; // Convert to USDC (6 decimals)

    console.log(`   🔍 Asset analysis: ${proposal.assetAddress.slice(0, 12)}...`);
    console.log(`   💰 Amount: ${amountInUSDC} USDC (${amount} raw)`);
    console.log(`   📄 USDC proposal: ${isUSDCProposal}`);
    console.log(`   📝 Type: ${proposal.proposalType === 0 ? 'INVEST' : proposal.proposalType === 1 ? 'DIVEST' : 'OTHER'}`);

    // Vote YES on small USDC investment proposals (up to 10 USDC)
    if (isUSDCProposal && proposal.proposalType === 0 && amountInUSDC <= 10) {
      console.log(`   ✅ USDC investment proposal under 10 USDC - voting YES`);
      return { vote: true, support: true };
    }

    // Vote NO on large USDC investments (over 10 USDC)
    if (isUSDCProposal && proposal.proposalType === 0 && amountInUSDC > 10) {
      console.log(`   ❌ USDC investment too large (${amountInUSDC} USDC) - voting NO`);
      return { vote: true, support: false };
    }

    // Vote NO on WBTC divestment proposals (conservative approach)
    if (proposal.proposalType === 1 && proposal.description.toLowerCase().includes('wbtc')) {
      console.log(`   ❌ WBTC divestment proposal - voting NO (conservative)`);
      return { vote: true, support: false };
    }

    // Vote YES on other small investment proposals
    if (proposal.proposalType === 0 && amountInUSDC <= 5) {
      console.log(`   ✅ Small investment proposal - voting YES`);
      return { vote: true, support: true };
    }

    console.log(`   ⏭️  Proposal doesn't meet voting criteria - abstaining`);
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
        setTimeout(() => reject(new Error('getActiveProposals timeout')), 10000)
      )
    ]);

    if (proposals.length === 0) {
      console.log('ℹ️  No active proposals found');
      return { totalVotes: 0, results: [] };
    }

    console.log(`📋 Found ${proposals.length} active proposals`);

    let totalVotes = 0;
    const results = [];

    // Process up to 3 proposals to balance coverage and timeout risk
    const proposalsToProcess = proposals.slice(0, 3);

    for (const proposal of proposalsToProcess) {
      console.log(`\n📋 Processing Proposal ${proposal.id}`);
      console.log(`   💰 Amount: ${proposal.amount}`);
      console.log(`   📍 Asset: ${proposal.assetAddress.slice(0, 10)}...`);
      console.log(`   📄 Description: ${proposal.description.substring(0, 50)}...`);

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
      for (let nodeIndex = 0; nodeIndex < Math.min(5, this.wallets.length); nodeIndex++) {
        if (!this.wallets[nodeIndex]) {
          console.log(`   ⚠️  Node ${nodeIndex + 1}: Wallet not available`);
          continue;
        }

        const nodeId = `ai-gov-${String(nodeIndex + 1).padStart(2, '0')}`;
        const nodeAddress = this.wallets[nodeIndex].address;

        console.log(`\n   🤖 Node ${nodeIndex + 1} (${nodeId}): ${nodeAddress.slice(0, 10)}...`);

        try {
          // Check if this node has already voted with timeout
          const hasVoted = await Promise.race([
            this.hasVoted(proposal.id, nodeIndex),
            new Promise<boolean>((_, reject) => 
              setTimeout(() => reject(new Error('hasVoted timeout')), 3000)
            )
          ]);

          if (hasVoted) {
            console.log(`      ℹ️  Already voted`);
            proposalResults.votes.push({ nodeIndex: nodeIndex + 1, status: 'already_voted' });
            continue;
          }

          // Cast vote with timeout
          const txHash = await Promise.race([
            this.castVote(proposal.id, nodeIndex, shouldVote.support),
            new Promise<string>((_, reject) => 
              setTimeout(() => reject(new Error('Vote transaction timeout')), 15000)
            )
          ]);
          console.log(`      ✅ Vote cast: ${txHash.slice(0, 10)}...`);
          totalVotes++;

          proposalResults.votes.push({ 
            nodeIndex: nodeIndex + 1, 
            status: 'success', 
            txHash: txHash.slice(0, 10) + '...' 
          });

          // Staggered delays to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1500 + (nodeIndex * 500)));

        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.error(`      ❌ Failed to vote:`, errorMsg.substring(0, 100));
          proposalResults.votes.push({ 
            nodeIndex: nodeIndex + 1, 
            status: 'failed', 
            error: errorMsg.substring(0, 100)
          });

          // Add delay even on failure to prevent overwhelming RPC
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      results.push(proposalResults);

      // Add delay between proposals
      if (proposal !== proposalsToProcess[proposalsToProcess.length - 1]) {
        console.log(`   ⏳ Waiting before next proposal...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }

    console.log(`\n📊 NETLIFY VOTING SUMMARY`);
    console.log(`   📝 Total votes cast: ${totalVotes}`);
    console.log(`   📋 Proposals processed: ${results.length}`);

    return { totalVotes, results };
  }
}

// Netlify scheduled function handler
export const handler: Handler = async (event, context) => {
  const requestId = context.awsRequestId?.substring(0, 8) || 'unknown';

  console.log(`🤖 Netlify Scheduled Voting Function triggered`);
  console.log(`⏳ Adding startup delay to prevent rate limiting...`);

  // Add initial delay to prevent immediate rate limiting
  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log(`🔍 Fetching active proposals...`);

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