import { WalletService } from './WalletService.js';
import { ContractService } from './ContractService.js';
export declare class CriticalProductionFixes {
    private contractService;
    private walletService;
    private readonly MAX_PROCESSING_TIME;
    private readonly MAX_PROPOSALS_PER_BATCH;
    private readonly MINIMUM_DELAY_BETWEEN_OPERATIONS;
    private readonly RPC_TIMEOUT;
    private readonly EMERGENCY_BRAKE_TIME;
    constructor(contractService: ContractService, walletService: WalletService);
    executeEmergencyVotingRound(): Promise<void>;
    private getProposalsWithEmergencyTimeout;
    private prioritizeProposals;
    private executeVotingWithTimeGuards;
    private processProposalWithGuards;
    private makeQuickVotingDecision;
    private checkVoteStatusWithTimeout;
    private castVoteWithTimeout;
    private delay;
    performEmergencyHealthCheck(): Promise<boolean>;
}
export default CriticalProductionFixes;
//# sourceMappingURL=CriticalProductionFixes.d.ts.map