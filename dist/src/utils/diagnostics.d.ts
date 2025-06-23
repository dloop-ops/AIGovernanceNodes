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
    /**
     * Run comprehensive diagnostics on all nodes
     */
    runFullDiagnostics(): Promise<NodeDiagnosticResult[]>;
    /**
     * Diagnose a specific node
     */
    diagnoseNode(nodeIndex: number): Promise<NodeDiagnosticResult>;
    /**
     * Attempt to fix common registration issues
     */
    attemptAutoFix(nodeIndex: number): Promise<{
        success: boolean;
        actions: string[];
        errors: string[];
    }>;
    /**
     * Generate diagnostic summary report
     */
    private generateDiagnosticSummary;
    /**
     * Monitor node status continuously
     */
    startContinuousMonitoring(intervalMs?: number): Promise<void>;
}
//# sourceMappingURL=diagnostics.d.ts.map