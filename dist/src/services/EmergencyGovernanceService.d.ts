import { ContractService } from './ContractService.js';
import { WalletService } from './WalletService.js';
/**
 * EMERGENCY GOVERNANCE SERVICE
 *
 * This service provides immediate fixes for the governance system
 * to resolve the critical blocking I/O issues preventing voting.
 *
 * Replaces the failing cron job mechanism with a more robust solution.
 */
export declare class EmergencyGovernanceService {
    private contractService;
    private walletService;
    private criticalFixes;
    private isExecuting;
    constructor(contractService: ContractService, walletService: WalletService);
    /**
     * Execute emergency voting round with all critical fixes applied
     */
    executeEmergencyVoting(): Promise<{
        success: boolean;
        message: string;
        details: any;
    }>;
    /**
     * Quick health check without complex operations
     */
    private performQuickHealthCheck;
    /**
     * Verify voting results after emergency intervention
     */
    private verifyVotingResults;
    /**
     * Get current governance status for monitoring
     */
    getGovernanceStatus(): Promise<any>;
    /**
     * Manual trigger for emergency voting (for API endpoints)
     */
    triggerManualVoting(): Promise<any>;
    /**
     * Check if emergency intervention is needed
     */
    shouldTriggerEmergency(): boolean;
}
export default EmergencyGovernanceService;
//# sourceMappingURL=EmergencyGovernanceService.d.ts.map