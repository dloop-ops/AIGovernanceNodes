import { ContractService } from './ContractService.js';
import { WalletService } from './WalletService.js';
export declare class EmergencyGovernanceService {
    private contractService;
    private walletService;
    private criticalFixes;
    private isExecuting;
    constructor(contractService: ContractService, walletService: WalletService);
    executeEmergencyVoting(): Promise<{
        success: boolean;
        message: string;
        details: any;
    }>;
    private performQuickHealthCheck;
    private verifyVotingResults;
    getGovernanceStatus(): Promise<any>;
    triggerManualVoting(): Promise<any>;
    shouldTriggerEmergency(): boolean;
}
export default EmergencyGovernanceService;
//# sourceMappingURL=EmergencyGovernanceService.d.ts.map