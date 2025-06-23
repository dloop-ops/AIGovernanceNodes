import { WalletService } from './WalletService.js';
import { ContractService } from './ContractService.js';
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
export declare class CriticalProductionFixes {
    private contractService;
    private walletService;
    private readonly MAX_PROCESSING_TIME;
    private readonly MAX_PROPOSALS_PER_BATCH;
    private readonly MINIMUM_DELAY_BETWEEN_OPERATIONS;
    private readonly RPC_TIMEOUT;
    private readonly EMERGENCY_BRAKE_TIME;
    constructor(contractService: ContractService, walletService: WalletService);
    /**
     * CRITICAL FIX 1: Non-blocking proposal processing with strict time limits
     */
    executeEmergencyVotingRound(): Promise<void>;
    /**
     * CRITICAL FIX 2: Emergency proposal fetching with absolute timeout
     */
    private getProposalsWithEmergencyTimeout;
    /**
     * CRITICAL FIX 3: Proposal prioritization to process most important first
     */
    private prioritizeProposals;
    /**
     * CRITICAL FIX 4: Voting execution with multiple safety guards
     */
    private executeVotingWithTimeGuards;
    /**
     * CRITICAL FIX 5: Individual proposal processing with timeout guards
     */
    private processProposalWithGuards;
    /**
     * CRITICAL FIX 6: Quick voting decision without complex analysis
     */
    private makeQuickVotingDecision;
    /**
     * CRITICAL FIX 7: Vote status check with timeout
     */
    private checkVoteStatusWithTimeout;
    /**
     * CRITICAL FIX 8: Vote casting with timeout protection
     */
    private castVoteWithTimeout;
    /**
     * Utility delay function
     */
    private delay;
    /**
     * CRITICAL FIX 9: System health check before voting
     */
    performEmergencyHealthCheck(): Promise<boolean>;
}
export default CriticalProductionFixes;
//# sourceMappingURL=CriticalProductionFixes.d.ts.map