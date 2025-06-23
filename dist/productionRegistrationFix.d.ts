/**
 * Production registration fix for DLoop AI Governance Nodes
 * Addresses custom error 0x06d919f2 with proper contract interaction
 */
declare class ProductionRegistrationFix {
    private providers;
    private currentProviderIndex;
    private wallets;
    constructor();
    private initializeProviders;
    private getCurrentProvider;
    private rotateProvider;
    private loadWallets;
    private updateWalletProviders;
    /**
     * Check node prerequisites including tokens and NFTs
     */
    checkNodePrerequisites(nodeIndex: number): Promise<{
        tokenBalance: string;
        tokenApproval: string;
        nftBalance: number;
        ready: boolean;
    }>;
    /**
     * Attempt node registration with error resilience
     */
    attemptNodeRegistration(nodeIndex: number): Promise<{
        success: boolean;
        txHash?: string;
        error?: string;
    }>;
    /**
     * Execute registration for all nodes
     */
    executeProductionFix(): Promise<void>;
}
export { ProductionRegistrationFix };
//# sourceMappingURL=productionRegistrationFix.d.ts.map