#!/usr/bin/env ts-node
declare class EmergencyGovernanceFix {
    private contractService;
    private walletService;
    private readonly EMERGENCY_TIMEOUT;
    private readonly MAX_PROPOSALS_EMERGENCY;
    private readonly RPC_EMERGENCY_TIMEOUT;
    private readonly OPERATION_DELAY;
    constructor();
    private initializeServices;
    executeEmergencyIntervention(): Promise<void>;
    private emergencyHealthCheck;
    private getActiveProposalsEmergency;
    private processEmergencyVoting;
    private processProposalEmergency;
    private makeEmergencyVotingDecision;
    private checkVoteStatusEmergency;
    private castVoteEmergency;
    private delay;
}
export { EmergencyGovernanceFix };
//# sourceMappingURL=emergency-governance-fix.d.ts.map