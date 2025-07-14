import { WalletService } from './WalletService.js';
import { ContractService } from './ContractService.js';
import { Proposal } from '../types/index.js';

/**
 * CRITICAL PRODUCTION FIXES
 *
 * This service implements immediate fixes for the blocking I/O issues
 * preventing automated governance voting cycles from executing.
 *
 * Issues Fixed:
 * 1. Blocking I/O operations in proposal processing
 * 2. High CPU usage causing cron job failures
 * 3. Insufficient timeout handling
 * 4. Resource exhaustion from batch processing
 */

export class CriticalProductionFixes {
  private contractService: ContractService;
  private walletService: WalletService;

  // Critical performance limits
  private readonly MAX_PROCESSING_TIME = 60000; // 1 minute max
  private readonly MAX_PROPOSALS_PER_BATCH = 5; // Process only 5 at a time
  private readonly MINIMUM_DELAY_BETWEEN_OPERATIONS = 1000; // 1 second minimum
  private readonly RPC_TIMEOUT = 5000; // 5 second RPC timeout
  private readonly EMERGENCY_BRAKE_TIME = 45000; // Emergency stop at 45 seconds

  constructor(contractService: ContractService, walletService: WalletService) {
    this.contractService = contractService;
    this.walletService = walletService;
  }

  /**
   * CRITICAL FIX 1: Non-blocking proposal processing with strict time limits
   */
  async executeEmergencyVotingRound(): Promise<void> {
    const startTime = Date.now();
    console.log('🚨 EMERGENCY VOTING ROUND - Critical fixes active');

    try {
      // Step 1: Get proposals with emergency timeout
      console.log('📊 Fetching proposals with emergency timeout...');
      const proposals = await this.getProposalsWithEmergencyTimeout();

      if (proposals.length === 0) {
        console.log('ℹ️  No active proposals found');
        return;
      }

      console.log(`✅ Found ${proposals.length} active proposals`);

      // Step 2: Process only critical proposals (USDC first)
      const criticalProposals = this.prioritizeProposals(proposals);
      const limitedProposals = criticalProposals.slice(0, this.MAX_PROPOSALS_PER_BATCH);

      console.log(`🎯 Processing ${limitedProposals.length} priority proposals`);

      // Step 3: Execute voting with strict time limits
      await this.executeVotingWithTimeGuards(limitedProposals, startTime);

      const totalTime = Date.now() - startTime;
      console.log(`✅ Emergency voting round completed in ${totalTime}ms`);
    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.error(`❌ Emergency voting round failed after ${totalTime}ms:`, error);

      // Don't throw - let system continue
      console.log('🔄 System will continue with next scheduled attempt');
    }
  }

  /**
   * CRITICAL FIX 2: Emergency proposal fetching with absolute timeout
   */
  private async getProposalsWithEmergencyTimeout(): Promise<Proposal[]> {
    return new Promise(async (resolve, reject) => {
      // Absolute timeout - prevent hanging
      const timeoutId = setTimeout(() => {
        console.log('⏰ EMERGENCY TIMEOUT: Proposal fetching stopped');
        resolve([]); // Return empty array instead of hanging
      }, this.RPC_TIMEOUT);

      try {
        console.log('🔍 Attempting to fetch proposals...');

        // Use existing optimized method with additional protection
        const proposals = await this.contractService.getProposals();

        clearTimeout(timeoutId);
        console.log(`📋 Successfully fetched ${proposals.length} proposals`);
        resolve(proposals);
      } catch (error) {
        clearTimeout(timeoutId);
        console.error('❌ Proposal fetching failed:', error);
        resolve([]); // Return empty array instead of throwing
      }
    });
  }

  /**
   * CRITICAL FIX 3: Proposal prioritization to process most important first
   */
  private prioritizeProposals(proposals: Proposal[]): Proposal[] {
    // Priority 1: USDC proposals (most important)
    const usdcProposals = proposals.filter((p) =>
      p.assetAddress.toLowerCase().includes('1c7d4b196cb0c7b01d743fbc6116a902379c7238')
    );

    // Priority 2: High-value proposals
    const highValueProposals = proposals.filter(
      (p) =>
        !p.assetAddress.toLowerCase().includes('1c7d4b196cb0c7b01d743fbc6116a902379c7238') &&
        parseFloat(p.amount) > 1000
    );

    // Priority 3: All other proposals
    const otherProposals = proposals.filter(
      (p) =>
        !p.assetAddress.toLowerCase().includes('1c7d4b196cb0c7b01d743fbc6116a902379c7238') &&
        parseFloat(p.amount) <= 1000
    );

    console.log(
      `📊 Proposal prioritization: USDC(${usdcProposals.length}) + High-value(${highValueProposals.length}) + Other(${otherProposals.length})`
    );

    return [...usdcProposals, ...highValueProposals, ...otherProposals];
  }

  /**
   * CRITICAL FIX 4: Voting execution with multiple safety guards
   */
  private async executeVotingWithTimeGuards(
    proposals: Proposal[],
    startTime: number
  ): Promise<void> {
    let processedCount = 0;
    let votedCount = 0;

    for (const proposal of proposals) {
      // Emergency brake check
      const elapsedTime = Date.now() - startTime;
      if (elapsedTime > this.EMERGENCY_BRAKE_TIME) {
        console.log(
          `🚨 EMERGENCY BRAKE: Stopping after ${elapsedTime}ms (processed ${processedCount}/${proposals.length})`
        );
        break;
      }

      try {
        console.log(
          `🔍 Processing proposal ${proposal.id} (${processedCount + 1}/${proposals.length})`
        );

        // Process with individual timeout
        const voted = await this.processProposalWithGuards(proposal);

        if (voted) {
          votedCount++;
          console.log(`✅ Voted on proposal ${proposal.id}`);
        } else {
          console.log(`⏭️  Skipped proposal ${proposal.id}`);
        }

        processedCount++;

        // Mandatory delay between operations
        if (processedCount < proposals.length) {
          await this.delay(this.MINIMUM_DELAY_BETWEEN_OPERATIONS);
        }
      } catch (error) {
        console.error(`❌ Failed to process proposal ${proposal.id}:`, error);
        processedCount++;

        // Continue with next proposal
        continue;
      }
    }

    console.log(
      `📊 Voting summary: ${votedCount} votes cast, ${processedCount} proposals processed`
    );
  }

  /**
   * CRITICAL FIX 5: Individual proposal processing with timeout guards
   */
  private async processProposalWithGuards(proposal: Proposal): Promise<boolean> {
    return new Promise(async (resolve) => {
      // Individual operation timeout
      const timeoutId = setTimeout(() => {
        console.log(`⏰ Proposal ${proposal.id} processing timeout`);
        resolve(false);
      }, 8000); // 8 second max per proposal

      try {
        // Quick voting decision (no complex analysis to save time)
        const shouldVote = this.makeQuickVotingDecision(proposal);

        if (!shouldVote.vote) {
          clearTimeout(timeoutId);
          resolve(false);
          return;
        }

        // Check if already voted (with timeout)
        const hasVoted = await this.checkVoteStatusWithTimeout(proposal.id);

        if (hasVoted) {
          clearTimeout(timeoutId);
          console.log(`ℹ️  Already voted on proposal ${proposal.id}`);
          resolve(false);
          return;
        }

        // Cast vote with timeout protection
        await this.castVoteWithTimeout(proposal.id, shouldVote.support);

        clearTimeout(timeoutId);
        resolve(true);
      } catch (error) {
        clearTimeout(timeoutId);
        console.error(`❌ Error in proposal ${proposal.id} processing:`, error);
        resolve(false);
      }
    });
  }

  /**
   * CRITICAL FIX 6: Quick voting decision without complex analysis
   */
  private makeQuickVotingDecision(proposal: Proposal): { vote: boolean; support: boolean } {
    // Simple heuristic for emergency voting
    const isUSDC = proposal.assetAddress
      .toLowerCase()
      .includes('1c7d4b196cb0c7b01d743fbc6116a902379c7238');
    const amount = parseFloat(proposal.amount);

    // Vote on USDC proposals under 10,000 (conservative approach)
    if (isUSDC && amount <= 10000) {
      return { vote: true, support: true }; // Support conservative USDC investments
    }

    // Skip complex analysis for now to prevent blocking
    return { vote: false, support: false };
  }

  /**
   * CRITICAL FIX 7: Vote status check with timeout
   */
  private async checkVoteStatusWithTimeout(proposalId: string): Promise<boolean> {
    return new Promise(async (resolve) => {
      const timeoutId = setTimeout(() => {
        console.log(`⏰ Vote status check timeout for proposal ${proposalId}`);
        resolve(false); // Assume not voted to avoid hanging
      }, 3000);

      try {
        // Use first available node for checking
        const hasVoted = await this.contractService.hasVoted(proposalId, 0);
        clearTimeout(timeoutId);
        resolve(hasVoted);
      } catch (error) {
        clearTimeout(timeoutId);
        console.error(`❌ Vote status check failed for ${proposalId}:`, error);
        resolve(false); // Assume not voted on error
      }
    });
  }

  /**
   * CRITICAL FIX 8: Vote casting with timeout protection
   */
  private async castVoteWithTimeout(proposalId: string, support: boolean): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        console.log(`⏰ Vote casting timeout for proposal ${proposalId}`);
        reject(new Error('Vote casting timeout'));
      }, 10000); // 10 second max for voting

      try {
        // Use first available node for voting
        const txHash = await this.contractService.vote(0, proposalId, support);
        clearTimeout(timeoutId);
        console.log(`🗳️  Vote cast: ${txHash}`);
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
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * CRITICAL FIX 9: System health check before voting
   */
  async performEmergencyHealthCheck(): Promise<boolean> {
    try {
      console.log('🏥 Emergency health check...');

      // Quick connectivity test - just try to get proposals
      const startTime = Date.now();
      const proposals = await this.contractService.getProposals();
      const responseTime = Date.now() - startTime;

      console.log(`✅ Health check passed (${responseTime}ms, ${proposals.length} proposals)`);
      return responseTime < 5000; // Consider healthy if under 5 seconds
    } catch (error) {
      console.error('❌ Health check failed:', error);
      return false;
    }
  }
}

export default CriticalProductionFixes;
