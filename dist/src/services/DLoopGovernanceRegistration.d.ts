import { WalletService } from './WalletService.js';
export declare class DLoopGovernanceRegistration {
    private walletService;
    private provider;
    private aiNodeRegistryContract;
    private dloopTokenContract;
    private soulboundNftContract;
    private adminWallet;
    constructor(walletService: WalletService);
    private initializeContracts;
    registerGovernanceNode(nodeIndex: number): Promise<{
        success: boolean;
        txHash?: string;
        error?: string;
    }>;
    private verifyAdminPermissions;
    private ensureNodeSoulBoundNFT;
    private setupTokenStaking;
    private performAdminRegistration;
    private verifyRegistrationStatus;
    registerAllGovernanceNodes(): Promise<{
        registered: number;
        failed: number;
        results: any[];
    }>;
}
//# sourceMappingURL=DLoopGovernanceRegistration.d.ts.map