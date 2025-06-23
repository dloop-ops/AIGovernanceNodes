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
declare class EmergencyGovernanceFix {
    private contractService;
    private walletService;
    private readonly EMERGENCY_TIMEOUT;
    private readonly MAX_PROPOSALS_EMERGENCY;
    private readonly RPC_EMERGENCY_TIMEOUT;
    private readonly OPERATION_DELAY;
    constructor();
    /**
     * Initialize services with emergency error handling
     */
    private initializeServices;
    /**
     * 🚨 EXECUTE EMERGENCY GOVERNANCE INTERVENTION
     */
    executeEmergencyIntervention(): Promise<void>;
    /**
     * Emergency health check with absolute timeout
     */
    private emergencyHealthCheck;
    /**
     * Get active proposals with emergency timeout protection
     */
    private getActiveProposalsEmergency;
    /**
     * Process emergency voting with strict limits
     */
    private processEmergencyVoting;
    /**
     * Process individual proposal with emergency protections
     */
    private processProposalEmergency;
    /**
     * Emergency voting decision (simple heuristic)
     */
    private makeEmergencyVotingDecision;
    /**
     * Check vote status with emergency timeout
     */
    private checkVoteStatusEmergency;
    /**
     * Cast vote with emergency timeout
     */
    private castVoteEmergency;
    /**
     * Utility delay function
     */
    private delay;
}
export { EmergencyGovernanceFix };
//# sourceMappingURL=emergency-governance-fix.d.ts.map