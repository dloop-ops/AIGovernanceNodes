import { WalletService } from './WalletService.js';
/**
 * D-Loop AI Governance Node Registration Service
 *
 * Implements proper registration for AI Governance Nodes according to D-Loop protocol
 * specifications. Handles SoulBound NFT verification, DLOOP token staking, and
 * proper admin delegation for node registration.
 */
export declare class DLoopGovernanceRegistration {
    private walletService;
    private provider;
    private aiNodeRegistryContract;
    private dloopTokenContract;
    private soulboundNftContract;
    private adminWallet;
    constructor(walletService: WalletService);
    private initializeContracts;
    /**
     * Register AI Governance Node according to D-Loop protocol specifications
     * HARD BLOCK: All 5 nodes are already registered - NEVER attempt registration
     */
    registerGovernanceNode(nodeIndex: number): Promise<{
        success: boolean;
        txHash?: string;
        error?: string;
    }>;
    /**
     * Verify admin has necessary permissions for node registration
     */
    private verifyAdminPermissions;
    /**
     * Ensure node has required SoulBound NFT for identity verification
     */
    private ensureNodeSoulBoundNFT;
    /**
     * Setup DLOOP token staking for governance node
     */
    private setupTokenStaking;
    /**
     * Perform admin registration of governance node
     */
    private performAdminRegistration;
    /**
     * Verify node registration status
     */
    private verifyRegistrationStatus;
    /**
     * Register multiple AI governance nodes
     */
    registerAllGovernanceNodes(): Promise<{
        registered: number;
        failed: number;
        results: any[];
    }>;
}
//# sourceMappingURL=DLoopGovernanceRegistration.d.ts.map