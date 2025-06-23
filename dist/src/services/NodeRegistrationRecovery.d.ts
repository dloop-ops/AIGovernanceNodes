import { RpcManager } from './RpcManager.js';
import { WalletService } from './WalletService.js';
export interface NodeRegistrationStatus {
    nodeId: string;
    address: string;
    isRegistered: boolean;
    hasTokens: boolean;
    isApproved: boolean;
    canStake: boolean;
    lastAttempt: number;
    attemptCount: number;
    status: 'pending' | 'processing' | 'registered' | 'failed';
    error?: string;
}
export declare class NodeRegistrationRecovery {
    private rpcManager;
    private transactionManager;
    private walletService;
    private registrationStatuses;
    private contractAddresses;
    private contractABIs;
    constructor(rpcManager: RpcManager, walletService: WalletService);
    private initializeRecoverySystem;
    private loadContractABIs;
    private scanUnregisteredNodes;
    private checkNodeRegistrationStatus;
    executeRegistrationRecovery(): Promise<{
        attempted: number;
        successful: number;
        failed: number;
        results: Array<{
            nodeId: string;
            success: boolean;
            error?: string;
            txHash?: string;
        }>;
    }>;
    private recoverNodeRegistration;
    private approveTokensWithEnhancedGas;
    private attemptRegistrationWithStaking;
    private attemptSimpleRegistration;
    private attemptRegistrationWithDirectApproval;
    getRegistrationStatuses(): Map<string, NodeRegistrationStatus>;
    refreshNodeStatus(nodeId: string): Promise<NodeRegistrationStatus | null>;
    private delay;
}
//# sourceMappingURL=NodeRegistrationRecovery.d.ts.map