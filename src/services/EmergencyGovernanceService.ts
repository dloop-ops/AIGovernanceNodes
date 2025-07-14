import { ContractService } from './ContractService.js';
import { WalletService } from './WalletService.js';
import { CriticalProductionFixes } from './CriticalProductionFixes';

/**
 * EMERGENCY GOVERNANCE SERVICE
 * 
 * This service provides immediate fixes for the governance system
 * to resolve the critical blocking I/O issues preventing voting.
 * 
 * Replaces the failing cron job mechanism with a more robust solution.
 */

export class EmergencyGovernanceService {
  private contractService: ContractService;
  private walletService: WalletService;
  private criticalFixes: CriticalProductionFixes;
  private isExecuting: boolean = false;

  constructor(contractService: ContractService, walletService: WalletService) {
    this.contractService = contractService;
    this.walletService = walletService;
    this.criticalFixes = new CriticalProductionFixes(contractService, walletService);
  }

  /**
   * Execute emergency voting round with all critical fixes applied
   */
  async executeEmergencyVoting(): Promise<{ success: boolean; message: string; details: any }> {
    if (this.isExecuting) {
      return {
        success: false,
        message: 'Emergency voting already in progress',
        details: { status: 'busy' }
      };
    }

    this.isExecuting = true;
    const startTime = Date.now();

    try {
      console.log('🚨 STARTING EMERGENCY GOVERNANCE INTERVENTION');
      console.log('============================================');

      // Step 1: Emergency health check
      console.log('🏥 Step 1: Emergency health check...');
      const isHealthy = await this.performQuickHealthCheck();

      if (!isHealthy) {
        throw new Error('System health check failed - aborting emergency voting');
      }

      // Step 2: Execute critical fixes voting round
      console.log('🗳️  Step 2: Executing emergency voting round...');
      await this.criticalFixes.executeEmergencyVotingRound();

      // Step 3: Verify results
      console.log('📊 Step 3: Verifying voting results...');
      const results = await this.verifyVotingResults();

      const totalTime = Date.now() - startTime;

      console.log('✅ EMERGENCY GOVERNANCE INTERVENTION COMPLETED');
      console.log(`⏱️  Total time: ${totalTime}ms`);

      return {
        success: true,
        message: 'Emergency voting completed successfully',
        details: {
          executionTime: totalTime,
          results: results,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      const totalTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      console.error('❌ EMERGENCY GOVERNANCE INTERVENTION FAILED');
      console.error(`⏱️  Failed after: ${totalTime}ms`);
      console.error(`🚨 Error: ${errorMessage}`);

      return {
        success: false,
        message: `Emergency voting failed: ${errorMessage}`,
        details: {
          executionTime: totalTime,
          error: errorMessage,
          timestamp: new Date().toISOString()
        }
      };

    } finally {
      this.isExecuting = false;
    }
  }

  /**
   * Quick health check without complex operations
   */
  private async performQuickHealthCheck(): Promise<boolean> {
    try {
      console.log('🔍 Testing basic connectivity...');

      // Test proposal count access (simplest operation)
      const proposals = await this.contractService.getProposals();
      console.log(`✅ Successfully accessed ${proposals.length} proposals`);

      return true;

    } catch (error) {
      console.error('❌ Health check failed:', error);
      return false;
    }
  }

  /**
   * Verify voting results after emergency intervention
   */
  private async verifyVotingResults(): Promise<any> {
    try {
      console.log('📋 Checking recent voting activity...');

      // Get current proposal state
      const proposals = await this.contractService.getProposals();
      const activeProposals = proposals.filter(p => p.state?.toString() === 'ACTIVE' || p.state === 1);

      console.log(`📊 Found ${activeProposals.length} active proposals after voting round`);

      return {
        totalProposals: proposals.length,
        activeProposals: activeProposals.length,
        status: 'verified'
      };

    } catch (error) {
      console.error('❌ Result verification failed:', error);
      return {
        status: 'verification_failed',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Get current governance status for monitoring
   */
  async getGovernanceStatus(): Promise<any> {
    try {
      const proposals = await this.contractService.getProposals();
      const activeProposals = proposals.filter(p => p.state?.toString() === 'ACTIVE' || p.state === 1);

      // Count USDC proposals specifically
      const usdcProposals = activeProposals.filter(p => 
        p.assetAddress.toLowerCase().includes('1c7d4b196cb0c7b01d743fbc6116a902379c7238')
      );

      return {
        status: 'operational',
        totalProposals: proposals.length,
        activeProposals: activeProposals.length,
        usdcProposals: usdcProposals.length,
        isExecuting: this.isExecuting,
        lastUpdate: new Date().toISOString()
      };

    } catch (error) {
      return {
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
        isExecuting: this.isExecuting,
        lastUpdate: new Date().toISOString()
      };
    }
  }

  /**
   * Manual trigger for emergency voting (for API endpoints)
   */
  async triggerManualVoting(): Promise<any> {
    console.log('🔄 Manual emergency voting triggered');
    return this.executeEmergencyVoting();
  }

  /**
   * Check if emergency intervention is needed
   */
  shouldTriggerEmergency(): boolean {
    // Always allow emergency voting for now until cron jobs are fixed
    return !this.isExecuting;
  }
}

export default EmergencyGovernanceService;