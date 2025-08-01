import { RpcManager } from './RpcManager.js';
import { WalletService } from './WalletService.js';
export interface NodeStatus {
    nodeId: string;
    address: string;
    isRegistered: boolean;
    isAuthenticated: boolean;
    hasTokens: boolean;
    registrationAttempts: number;
    lastRegistrationAttempt: number;
    status: 'pending' | 'registering' | 'registered' | 'failed';
}
export declare class ComprehensiveNodeManager {
    private rpcManager;
    private walletService;
    private nodeRegistrationService;
    private nodeStatuses;
    private isProcessing;
    private allNodeIds;
    constructor(rpcManager: RpcManager, walletService: WalletService);
    initializeAndRegisterAllNodes(): Promise<boolean>;
    private processNodeRegistration;
    private loadNodeConfigurations;
    getNodeStatuses(): Map<string, NodeStatus>;
    getRegistrationSummary(): {
        total: number;
        registered: number;
        pending: number;
        failed: number;
        inProgress: boolean;
    };
    private logRegistrationSummary;
    retryFailedRegistrations(): Promise<void>;
    private delay;
    private registerSingleNode;
    private performDetailedStatusCheck;
}
//# sourceMappingURL=ComprehensiveNodeManager.d.ts.map