declare class FinalRegistrationFix {
    private providers;
    private currentProviderIndex;
    private registryContract;
    private wallets;
    constructor();
    private initializeProviders;
    private getCurrentProvider;
    private rotateProvider;
    private initializeContracts;
    private loadWallets;
    /**
     * Attempt registration with proper error handling and provider rotation
     */
    attemptNodeRegistration(nodeIndex: number): Promise<{
        success: boolean;
        transactionHash?: string;
        blockNumber?: number;
        error?: string;
    }>;
    /**
     * Execute registration for all nodes
     */
    executeAllRegistrations(): Promise<void>;
}
export { FinalRegistrationFix };
//# sourceMappingURL=finalRegistrationFix.d.ts.map