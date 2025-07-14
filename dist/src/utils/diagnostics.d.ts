import { WalletService } from '../services/WalletService.js';
import { ContractService } from '../services/ContractService.js';
export interface NodeDiagnosticResult {
    nodeIndex: number;
    address: string;
    isRegistered: boolean;
    dloopBalance: string;
    ethBalance: string;
    hasStakeApproval: boolean;
    stakeRequirement: string;
    registrationErrors: string[];
}
export declare class DiagnosticService {
    private walletService;
    private contractService;
    constructor(walletService: WalletService, contractService: ContractService);
    runFullDiagnostics(): Promise<NodeDiagnosticResult[]>;
    diagnoseNode(nodeIndex: number): Promise<NodeDiagnosticResult>;
    attemptAutoFix(nodeIndex: number): Promise<{
        success: boolean;
        actions: string[];
        errors: string[];
    }>;
    private generateDiagnosticSummary;
    startContinuousMonitoring(intervalMs?: number): Promise<void>;
}
//# sourceMappingURL=diagnostics.d.ts.map