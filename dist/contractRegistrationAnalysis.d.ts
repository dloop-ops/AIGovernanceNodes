/**
 * Contract registration analysis to decode custom error 0x06d919f2
 * and implement working registration solution
 */
declare class ContractRegistrationAnalysis {
    private provider;
    private registryContract;
    private dloopContract;
    private wallet;
    constructor();
    private initializeContracts;
    /**
     * Analyze contract state and requirements
     */
    analyzeContractRequirements(): Promise<void>;
    /**
     * Investigate the specific custom error 0x06d919f2
     */
    private investigateCustomError;
    /**
     * Try alternative registration approaches
     */
    private tryAlternativeRegistration;
    /**
     * Execute comprehensive analysis
     */
    executeAnalysis(): Promise<void>;
}
export { ContractRegistrationAnalysis };
//# sourceMappingURL=contractRegistrationAnalysis.d.ts.map