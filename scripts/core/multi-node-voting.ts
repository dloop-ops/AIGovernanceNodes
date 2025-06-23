#!/usr/bin/env ts-node

/**
 * 🗳️ MULTI-NODE VOTING SCRIPT
 * 
 * This script ensures ALL 5 AI governance nodes vote on active proposals
 * instead of just the first node.
 */

import dotenv from 'dotenv';
import { ethers } from 'ethers';
import { ContractService } from '../../src/services/ContractService.js';
import { WalletService } from '../../src/services/WalletService.js';
import { Proposal, ProposalState } from '../../src/types/index.js';

// Load environment variables from .env file
dotenv.config();

class MultiNodeVoting {
  private contractService!: ContractService;
  private walletService!: WalletService;
  
  // Performance limits
  private readonly TIMEOUT = 60000; // 60 seconds max execution
  private readonly MAX_PROPOSALS = 10; // Process up to 10 proposals
  private readonly RPC_TIMEOUT = 30000; // 30 second RPC timeout
  private readonly OPERATION_DELAY = 3000; // 3 second delay between node operations

  constructor() {
    console.log('🗳️ INITIALIZING MULTI-NODE VOTING SYSTEM');
    console.log('========================================');
    
    this.initializeServices();
  }

  private initializeServices(): void {
    try {
      this.walletService = new WalletService();
      console.log('✅ WalletService initialized');

      this.contractService = new ContractService(this.walletService);
      console.log('✅ ContractService initialized');

    } catch (error) {
      console.error('❌ Failed to initialize services:', error);
      throw new Error('Service initialization failed');
    }
  }

  /**
   * Execute voting with all 5 nodes
   */
  async executeMultiNodeVoting(): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log('🗳️ STARTING MULTI-NODE VOTING');
      console.log('=============================');
      console.log(`⏰ Start time: ${new Date().toISOString()}`);

      // Step 1: Health check
      console.log('\n🏥 STEP 1: Health Check');
      const isHealthy = await this.healthCheck();
      
      if (!isHealthy) {
        throw new Error('🚨 CRITICAL: System health check failed');
      }

      // Step 2: Get active proposals
      console.log('\n📊 STEP 2: Fetching Active Proposals');
      const proposals = await this.getActiveProposals();
      
      if (proposals.length === 0) {
        console.log('ℹ️  No active proposals found');
        return;
      }

      console.log(`📋 Found ${proposals.length} active proposals`);

      // Step 3: Vote with all 5 nodes
      console.log('\n🗳️  STEP 3: Multi-Node Voting Process');
      await this.processVotingAllNodes(proposals);

      const totalTime = Date.now() - startTime;
      console.log('\n✅ MULTI-NODE VOTING COMPLETED');
      console.log('==============================');
      console.log(`⏱️  Total execution time: ${totalTime}ms`);

    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.error('\n❌ MULTI-NODE VOTING FAILED');
      console.error('===========================');
      console.error(`⏱️  Failed after: ${totalTime}ms`);
      console.error(`🚨 Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Health check with timeout
   */
  private async healthCheck(): Promise<boolean> {
    return new Promise(async (resolve) => {
      console.log('🔍 Testing basic connectivity...');
      
      const timeoutId = setTimeout(() => {
        console.log('⏰ Health check timeout');
        resolve(false);
      }, this.RPC_TIMEOUT);

      try {
        const provider = this.walletService.getProvider();
        const assetDao = new ethers.Contract(
          process.env.ASSET_DAO_CONTRACT_ADDRESS!,
          ["function getProposalCount() view returns (uint256)"],
          provider
        );
        
        const count = await assetDao.getProposalCount();
        clearTimeout(timeoutId);
        
        console.log(`✅ Health check passed - found ${count.toString()} total proposals`);
        resolve(true);
        
      } catch (error) {
        clearTimeout(timeoutId);
        console.error('❌ Health check failed:', error);
        resolve(false);
      }
    });
  }

  /**
   * Get active proposals
   */
  private async getActiveProposals(): Promise<Proposal[]> {
    return new Promise(async (resolve) => {
      console.log('📋 Fetching active proposals...');
      
      const timeoutId = setTimeout(() => {
        console.log('⏰ Proposal fetching timeout');
        resolve([]);
      }, this.RPC_TIMEOUT);

      try {
        const provider = this.walletService.getProvider();
        const assetDao = new ethers.Contract(
          process.env.ASSET_DAO_CONTRACT_ADDRESS!,
          [
            "function getProposalCount() view returns (uint256)",
            "function getProposal(uint256) view returns (uint256, uint8, address, uint256, string, address, uint256, uint256, uint256, uint256, uint8, bool)"
          ],
          provider
        );
        
        const count = await assetDao.getProposalCount();
        const totalCount = Number(count);
        const startFrom = Math.max(1, totalCount - 19); // Check last 20 proposals
        
        console.log(`📊 Checking proposals ${startFrom}-${totalCount} for active ones...`);
        
        const activeProposals: Proposal[] = [];
        
        for (let i = startFrom; i <= totalCount; i++) {
          try {
            const proposalData = await assetDao.getProposal(i);
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
                   state: ProposalState.ACTIVE,
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
        
        clearTimeout(timeoutId);
        resolve(activeProposals);
        
      } catch (error) {
        clearTimeout(timeoutId);
        console.error('❌ Failed to fetch proposals:', error);
        resolve([]);
      }
    });
  }

  /**
   * Process voting with all 5 nodes
   */
  private async processVotingAllNodes(proposals: Proposal[]): Promise<void> {
    console.log(`🎯 Processing ${proposals.length} proposals with all 5 nodes`);
    
    let totalVotes = 0;
    
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
      
      // Vote with each of the 5 nodes
      for (let nodeIndex = 0; nodeIndex < 5; nodeIndex++) {
        const nodeId = `ai-gov-${String(nodeIndex + 1).padStart(2, '0')}`;
        const nodeAddress = this.walletService.getWallet(nodeIndex).address;
        
        console.log(`\n   🤖 Node ${nodeIndex + 1} (${nodeId}): ${nodeAddress.slice(0, 10)}...`);
        
        try {
          // Check if this node has already voted
          const hasVoted = await this.checkVoteStatus(proposal.id, nodeIndex);
          
          if (hasVoted) {
            console.log(`      ℹ️  Already voted`);
            continue;
          }
          
          // Cast vote
          const txHash = await this.castVote(proposal.id, nodeIndex, shouldVote.support);
          console.log(`      ✅ Vote cast: ${txHash.slice(0, 10)}...`);
          totalVotes++;
          
          // Delay between nodes to avoid rate limiting
          if (nodeIndex < 4) {
            console.log(`      ⏱️  Waiting ${this.OPERATION_DELAY}ms before next node...`);
            await this.delay(this.OPERATION_DELAY);
          }
          
        } catch (error) {
          console.error(`      ❌ Failed to vote:`, error);
        }
      }
    }
    
    console.log(`\n📊 MULTI-NODE VOTING SUMMARY`);
    console.log(`   📝 Total votes cast: ${totalVotes}`);
  }

  /**
   * Make voting decision
   */
  private makeVotingDecision(proposal: Proposal): { vote: boolean; support: boolean } {
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

  /**
   * Check vote status for specific node
   */
  private async checkVoteStatus(proposalId: string, nodeIndex: number): Promise<boolean> {
    return new Promise(async (resolve) => {
      const timeoutId = setTimeout(() => {
        resolve(false);
      }, 5000);

      try {
        const hasVoted = await this.contractService.hasVoted(proposalId, nodeIndex);
        clearTimeout(timeoutId);
        resolve(hasVoted);
      } catch (error) {
        clearTimeout(timeoutId);
        resolve(false);
      }
    });
  }

  /**
   * Cast vote for specific node
   */
  private async castVote(proposalId: string, nodeIndex: number, support: boolean): Promise<string> {
    return new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Vote casting timeout'));
      }, 30000);

      try {
        const txHash = await this.contractService.vote(nodeIndex, proposalId, support);
        clearTimeout(timeoutId);
        resolve(txHash);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * MAIN EXECUTION
 */
async function main(): Promise<void> {
  try {
    console.log('🗳️ Multi-Node Voting System');
    console.log('==========================');
    console.log(`Started at: ${new Date().toISOString()}`);
    
    const multiNodeVoting = new MultiNodeVoting();
    await multiNodeVoting.executeMultiNodeVoting();
    
    console.log('\n🎯 Multi-node voting completed');
    process.exit(0);
    
  } catch (error) {
    console.error('\n💥 CRITICAL ERROR:', error);
    process.exit(1);
  }
}

// Execute if called directly
main().catch(console.error);

export { MultiNodeVoting }; 