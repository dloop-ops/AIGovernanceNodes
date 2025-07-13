#!/usr/bin/env ts-node

/**
 * 🚨 EMERGENCY GOVERNANCE FIX SCRIPT
 * 
 * This script provides immediate relief for the governance system
 * by bypassing the failing cron job mechanism completely.
 * 
 * CRITICAL ISSUES ADDRESSED:
 * 1. Blocking I/O causing missed cron executions
 * 2. High CPU usage preventing automated voting
 * 3. Resource exhaustion from batch processing
 * 4. Poor timeout handling causing system hangs
 * 
 * USAGE:
 * npm run emergency-fix
 * 
 * This script can also be called directly:
 * npx ts-node scripts/emergency-governance-fix.ts
 */

import dotenv from 'dotenv';
import { ethers } from 'ethers';
import { ContractService } from '../../src/services/ContractService';
import { WalletService } from '../../src/services/WalletService';
import { Proposal, ProposalState } from '../../src/types';

// Load environment variables from .env file
dotenv.config();

class EmergencyGovernanceFix {
  private contractService!: ContractService;
  private walletService!: WalletService;
  
  // Emergency performance limits
  private readonly EMERGENCY_TIMEOUT = 60000; // 60 seconds max execution for blockchain ops
  private readonly MAX_PROPOSALS_EMERGENCY = 10; // Process up to 10 proposals to cover all active ones including new ones
  private readonly RPC_EMERGENCY_TIMEOUT = 30000; // 30 second RPC timeout (with delays for rate limiting)
  private readonly OPERATION_DELAY = 2000; // 2 second delay between operations

  constructor() {
    console.log('🚨 INITIALIZING EMERGENCY GOVERNANCE FIX');
    console.log('========================================');
    
    // Initialize services with emergency configurations
    this.initializeServices();
  }

  /**
   * Initialize services with emergency error handling
   */
  private initializeServices(): void {
    try {
      // Initialize WalletService
      this.walletService = new WalletService();
      console.log('✅ WalletService initialized');

      // Initialize ContractService with emergency timeout
      this.contractService = new ContractService(this.walletService);
      console.log('✅ ContractService initialized');

    } catch (error) {
      console.error('❌ Failed to initialize services:', error);
      throw new Error('Service initialization failed');
    }
  }

  /**
   * 🚨 EXECUTE EMERGENCY GOVERNANCE INTERVENTION
   */
  async executeEmergencyIntervention(): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log('🚨 STARTING EMERGENCY GOVERNANCE INTERVENTION');
      console.log('===========================================');
      console.log(`⏰ Start time: ${new Date().toISOString()}`);
      console.log(`🎯 Emergency limits: ${this.MAX_PROPOSALS_EMERGENCY} proposals, ${this.EMERGENCY_TIMEOUT}ms timeout`);

      // Step 1: Emergency system health check
      console.log('\n🏥 STEP 1: Emergency Health Check');
      const isHealthy = await this.emergencyHealthCheck();
      
      if (!isHealthy) {
        throw new Error('🚨 CRITICAL: System health check failed - aborting intervention');
      }

      // Step 2: Get active proposals with emergency timeout
      console.log('\n📊 STEP 2: Fetching Active Proposals');
      const proposals = await this.getActiveProposalsEmergency();
      
      if (proposals.length === 0) {
        console.log('ℹ️  No active proposals found - intervention complete');
        return;
      }

      // Step 3: Process priority proposals only
      console.log('\n🗳️  STEP 3: Emergency Voting Process');
      await this.processEmergencyVoting(proposals, startTime);

      const totalTime = Date.now() - startTime;
      console.log('\n✅ EMERGENCY GOVERNANCE INTERVENTION COMPLETED');
      console.log('===========================================');
      console.log(`⏱️  Total execution time: ${totalTime}ms`);
      console.log(`🎯 Completed at: ${new Date().toISOString()}`);

    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.error('\n❌ EMERGENCY GOVERNANCE INTERVENTION FAILED');
      console.error('=========================================');
      console.error(`⏱️  Failed after: ${totalTime}ms`);
      console.error(`🚨 Error: ${error instanceof Error ? error.message : String(error)}`);
      
      // Don't throw - log and continue
      console.log('🔄 System will attempt recovery on next run');
    }
  }

  /**
   * Emergency health check with absolute timeout
   */
  private async emergencyHealthCheck(): Promise<boolean> {
    return new Promise(async (resolve) => {
      console.log('🔍 Testing basic connectivity...');
      
      const timeoutId = setTimeout(() => {
        console.log('⏰ Health check timeout - assuming unhealthy');
        resolve(false);
      }, this.RPC_EMERGENCY_TIMEOUT);

      try {
        // Simple connectivity test - just get proposal count, don't fetch all proposals
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
   * Get active proposals with emergency timeout protection
   */
  private async getActiveProposalsEmergency(): Promise<Proposal[]> {
    return new Promise(async (resolve) => {
      console.log('📋 Fetching active proposals with emergency timeout...');
      
      const timeoutId = setTimeout(() => {
        console.log('⏰ Proposal fetching timeout - returning empty array');
        resolve([]);
      }, this.RPC_EMERGENCY_TIMEOUT);

      try {
        // Use direct contract calls for speed - get only the first 20 proposals
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
        const startFrom = Math.max(1, totalCount - 19); // Check last 20 proposals instead of first 20
        const maxToCheck = totalCount;
        
        console.log(`📊 Checking proposals ${startFrom}-${maxToCheck} (last 20 of ${totalCount}) for active ones...`);
        
        const activeProposals: Proposal[] = [];
        
                for (let i = startFrom; i <= maxToCheck; i++) {
          try {
            const proposalData = await assetDao.getProposal(i);
            const state = proposalData[10]; // status field from ABI
            
            // 0 = PENDING, 1 = ACTIVE, 2 = SUCCEEDED, 3 = DEFEATED, 4 = QUEUED, 5 = EXECUTED, 6 = CANCELLED
            if (Number(state) === 1) {
              // Check if voting period is still valid (not expired)
              // Use EXACT same field mapping as diagnostic script
              const currentTime = Math.floor(Date.now() / 1000);
              const state = Number(proposalData[10]);       // Correct field index for state  
              const votingEnds = Number(proposalData[7]);   // Correct field index for end time
              const timeLeft = votingEnds - currentTime;
              
              if (timeLeft > 0) {
                activeProposals.push({
                  id: i.toString(),
                  proposer: proposalData[5],
                  proposalType: proposalData[1],
                  assetAddress: proposalData[2],
                  amount: ethers.formatEther(proposalData[3]),
                  description: proposalData[4],
                  state: ProposalState.ACTIVE,
                  votesFor: ethers.formatEther(proposalData[8]),
                  votesAgainst: ethers.formatEther(proposalData[9]),
                  startTime: Number(proposalData[6]),
                  endTime: Number(proposalData[7]),
                  executed: proposalData[11],
                  cancelled: false
                });
                console.log(`   ✅ Found VALID active proposal ${i} (${Math.floor(timeLeft / 3600)}h left)`);
              } else {
                console.log(`   ⏰ Skipped proposal ${i} - voting period expired ${Math.abs(timeLeft)}s ago`);
              }
            }
          } catch (error: any) {
            console.log(`   ⚠️  Skipped proposal ${i}: ${error?.message?.slice(0, 100) || error}...`);
            // Add delay on error to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }
          
          // Add small delay between calls to avoid rate limiting
          if (i < maxToCheck) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }
        
        clearTimeout(timeoutId);
        console.log(`📊 Found ${activeProposals.length} active proposals in first ${maxToCheck}`);
        resolve(activeProposals);
        
      } catch (error) {
        clearTimeout(timeoutId);
        console.error('❌ Failed to fetch proposals:', error);
        resolve([]);
      }
    });
  }

  /**
   * Process emergency voting with strict limits
   */
  private async processEmergencyVoting(proposals: Proposal[], startTime: number): Promise<void> {
    console.log(`🎯 Processing up to ${this.MAX_PROPOSALS_EMERGENCY} priority proposals...`);
    
    // Priority 1: USDC proposals (most critical)
    const usdcProposals = proposals.filter(p => 
      p.assetAddress.toLowerCase().includes('1c7d4b196cb0c7b01d743fbc6116a902379c7238')
    );
    
    // Priority 2: High-value proposals
    const highValueProposals = proposals.filter(p => 
      !p.assetAddress.toLowerCase().includes('1c7d4b196cb0c7b01d743fbc6116a902379c7238') &&
      parseFloat(p.amount) > 1000
    );
    
    console.log(`📊 Priority breakdown: USDC(${usdcProposals.length}) + High-value(${highValueProposals.length})`);
    
    // Select top priority proposals
    const priorityProposals = [...usdcProposals, ...highValueProposals]
      .slice(0, this.MAX_PROPOSALS_EMERGENCY);
    
    console.log(`🎯 Selected ${priorityProposals.length} proposals for emergency processing`);
    
    let processedCount = 0;
    let votedCount = 0;
    
    for (const proposal of priorityProposals) {
      // Emergency brake check
      const elapsedTime = Date.now() - startTime;
      if (elapsedTime > this.EMERGENCY_TIMEOUT) {
        console.log(`🚨 EMERGENCY BRAKE: Stopping after ${elapsedTime}ms`);
        break;
      }
      
      try {
        console.log(`\n🔍 Processing proposal ${proposal.id} (${processedCount + 1}/${priorityProposals.length})`);
        console.log(`   💰 Amount: ${proposal.amount}`);
        console.log(`   📍 Asset: ${proposal.assetAddress.slice(0, 10)}...`);
        
        const voted = await this.processProposalEmergency(proposal);
        
        if (voted) {
          votedCount++;
          console.log(`   ✅ Vote cast successfully`);
        } else {
          console.log(`   ⏭️  Skipped (already voted or error)`);
        }
        
        processedCount++;
        
        // Mandatory delay between operations
        if (processedCount < priorityProposals.length) {
          console.log(`   ⏱️  Waiting ${this.OPERATION_DELAY}ms before next operation...`);
          await this.delay(this.OPERATION_DELAY);
        }
        
      } catch (error) {
        console.error(`   ❌ Failed to process proposal ${proposal.id}:`, error);
        processedCount++;
        continue;
      }
    }
    
    console.log(`\n📊 EMERGENCY VOTING SUMMARY`);
    console.log(`   📝 Processed: ${processedCount} proposals`);
    console.log(`   🗳️  Voted: ${votedCount} times`);
    console.log(`   ⏱️  Time: ${Date.now() - startTime}ms`);
  }

  /**
   * Process individual proposal with emergency protections
   */
  private async processProposalEmergency(proposal: Proposal): Promise<boolean> {
    return new Promise(async (resolve) => {
      const timeoutId = setTimeout(() => {
        console.log(`   ⏰ Proposal ${proposal.id} processing timeout`);
        resolve(false);
      }, 15000); // 15 second max per proposal for blockchain transactions

      try {
        // Simple voting decision for emergency
        const shouldVote = this.makeEmergencyVotingDecision(proposal);
        
        if (!shouldVote.vote) {
          clearTimeout(timeoutId);
          resolve(false);
          return;
        }

        // Check voting status with timeout
        const hasVoted = await this.checkVoteStatusEmergency(proposal.id);
        
        if (hasVoted) {
          clearTimeout(timeoutId);
          console.log(`   ℹ️  Already voted on proposal ${proposal.id}`);
          resolve(false);
          return;
        }

        // Cast vote with timeout
        await this.castVoteEmergency(proposal.id, shouldVote.support);
        
        clearTimeout(timeoutId);
        resolve(true);
        
      } catch (error) {
        clearTimeout(timeoutId);
        console.error(`   ❌ Error processing proposal ${proposal.id}:`, error);
        resolve(false);
      }
    });
  }

  /**
   * Emergency voting decision (simple heuristic)
   */
  private makeEmergencyVotingDecision(proposal: Proposal): { vote: boolean; support: boolean } {
    const isUSDC = proposal.assetAddress.toLowerCase().includes('1c7d4b196cb0c7b01d743fbc6116a902379c7238');
    const amount = parseFloat(proposal.amount);
    
    // Conservative approach: only vote on small USDC proposals
    if (isUSDC && amount <= 5000) {
      console.log(`   🎯 USDC proposal ${proposal.id} under $5,000 - voting YES`);
      return { vote: true, support: true };
    }
    
    console.log(`   ⏭️  Skipping proposal ${proposal.id} (not priority or too large)`);
    return { vote: false, support: false };
  }

  /**
   * Check vote status with emergency timeout
   */
  private async checkVoteStatusEmergency(proposalId: string): Promise<boolean> {
    return new Promise(async (resolve) => {
      const timeoutId = setTimeout(() => {
        console.log(`   ⏰ Vote status timeout for ${proposalId}`);
        resolve(false);
      }, 2000);

      try {
        const hasVoted = await this.contractService.hasVoted(proposalId, 0);
        clearTimeout(timeoutId);
        resolve(hasVoted);
      } catch (error) {
        clearTimeout(timeoutId);
        console.error(`   ❌ Vote status check failed:`, error);
        resolve(false);
      }
    });
  }

  /**
   * Cast vote with emergency timeout
   */
  private async castVoteEmergency(proposalId: string, support: boolean): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        console.log(`   ⏰ Vote casting timeout for ${proposalId}`);
        reject(new Error('Vote casting timeout'));
      }, 30000); // 30 seconds for blockchain transaction

      try {
        const txHash = await this.contractService.vote(0, proposalId, support);
        clearTimeout(timeoutId);
        console.log(`   🗳️  Vote cast: ${txHash.slice(0, 10)}...`);
        resolve();
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
    console.log('🚨 DLoop AI Governance - Emergency Fix Script');
    console.log('============================================');
    console.log(`Started at: ${new Date().toISOString()}`);
    
    const emergencyFix = new EmergencyGovernanceFix();
    await emergencyFix.executeEmergencyIntervention();
    
    console.log('\n🎯 Emergency fix completed - system should be operational');
    process.exit(0);
    
  } catch (error) {
    console.error('\n💥 CRITICAL ERROR in emergency fix script:', error);
    console.log('\n🔄 Please retry or contact system administrator');
    process.exit(1);
  }
}

// Execute if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { EmergencyGovernanceFix }; 