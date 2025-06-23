interface RegistrationAttempt {
    nodeAddress: string;
    metadata: string;
    gasLimit: bigint;
    gasPrice: bigint;
    success: boolean;
    error?: string;
}
declare class RegistrationBlockerResolver {
    private provider;
    private registryContract;
    private dloopContract;
    private soulboundContract;
    private wallets;
    constructor();
    private initializeContracts;
    private loadWallets;
    /**
     * Analyze the custom error 0x06d919f2
     */
    private analyzeCustomError;
    /**
     * Comprehensive prerequisite verification
     */
    verifyAllPrerequisites(nodeIndex: number): Promise<{
        tokenBalance: bigint;
        tokenApproval: bigint;
        soulboundBalance: bigint;
        ethBalance: bigint;
        requiredStake: bigint;
        minReputation: bigint;
        contractPaused: boolean;
        meetsRequirements: boolean;
    }>;
    /**
     * Try alternative registration approaches
     */
    attemptAlternativeRegistration(nodeIndex: number): Promise<RegistrationAttempt>;
    /**
     * Execute comprehensive registration resolution
     */
    resolveRegistrationBlockers(): Promise<void>;
}
export { RegistrationBlockerResolver };
//# sourceMappingURL=resolveRegistrationBlocker.d.ts.map