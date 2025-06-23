/**
 * Optimized Node Registration System
 * Implements enterprise-grade RPC management and contract interface optimization
 */
interface NodeConfig {
    index: number;
    address: string;
    privateKey: string;
    name: string;
    strategy: string;
}
declare class OptimizedNodeRegistration {
    private logger;
    private rpcEndpoints;
    private currentProviderIndex;
    private contracts;
    private nodeConfigs;
    constructor();
    private initializeLogger;
    private initializeRpcEndpoints;
    private getCurrentProvider;
    private rotateProvider;
    private loadNodeConfigurations;
    private initializeContracts;
    /**
     * Check node prerequisites with enhanced validation
     */
    checkNodePrerequisites(nodeConfig: NodeConfig): Promise<{
        tokenBalance: bigint;
        tokenApproval: bigint;
        soulboundBalance: bigint;
        isRegistered: boolean;
        hasRequiredRoles: boolean;
        ready: boolean;
    }>;
    /**
     * Execute optimized node registration with error resilience
     */
    registerNode(nodeConfig: NodeConfig): Promise<{
        success: boolean;
        txHash?: string;
        error?: string;
    }>;
    /**
     * Execute optimized registration for all nodes
     */
    executeOptimizedRegistration(): Promise<void>;
}
export { OptimizedNodeRegistration };
//# sourceMappingURL=optimizedNodeRegistration.d.ts.map