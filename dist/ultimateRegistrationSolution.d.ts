/**
 * Ultimate registration solution addressing custom error 0x06d919f2
 * Direct contract interaction with proper function signatures
 */
declare class UltimateRegistrationSolution {
    private provider;
    private registryContract;
    private dloopContract;
    private wallets;
    constructor();
    private initializeContracts;
    private loadWallets;
    /**
     * Verify node prerequisites
     */
    verifyPrerequisites(nodeIndex: number): Promise<boolean>;
    /**
     * Execute node registration with proper error handling
     */
    executeNodeRegistration(nodeIndex: number): Promise<{
        success: boolean;
        transactionHash?: string;
        blockNumber?: number;
        error?: string;
    }>;
    /**
     * Execute registration for all eligible nodes
     */
    executeUltimateRegistration(): Promise<void>;
}
export { UltimateRegistrationSolution };
//# sourceMappingURL=ultimateRegistrationSolution.d.ts.map