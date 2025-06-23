import { RpcManager } from './RpcManager.js';
import { WalletService } from './WalletService.js';
export interface NodeRegistrationConfig {
    nodeId: string;
    nodeAddress: string;
    nodeName: string;
    endpoint: string;
    nodeType: string;
    nodeIndex: number;
}
export interface RegistrationResult {
    success: boolean;
    isRegistered: boolean;
    transactionHash?: string;
    error?: string;
    requirementsMet?: boolean;
    stakingComplete?: boolean;
    authenticationStatus?: boolean;
}
export declare class EnhancedNodeRegistration {
    private rpcManager;
    private transactionManager;
    private walletService;
    private contractAddresses;
    private contractABIs;
    constructor(rpcManager: RpcManager, walletService: WalletService);
    private loadContractABIs;
    registerNodeWithComprehensiveFlow(config: NodeRegistrationConfig): Promise<RegistrationResult>;
    private checkNodeRegistrationStatus;
    private verifyTokenRequirements;
    private approveTokensWithFallback;
    private registerWithMultipleStrategies;
    private registerWithStakingMethod;
    private registerWithSafeApprovalMethod;
    private registerWithOptimizedApprovalMethod;
    batchRegisterNodes(configs: NodeRegistrationConfig[]): Promise<{
        successful: string[];
        failed: Array<{
            nodeId: string;
            error: string;
        }>;
        totalProcessed: number;
    }>;
    private delay;
}
//# sourceMappingURL=EnhancedNodeRegistration.d.ts.map