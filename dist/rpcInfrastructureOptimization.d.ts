import { ethers } from 'ethers';
declare class OptimizedRpcManager {
    private providers;
    private currentProviderIndex;
    private maxRequestsPerSecond;
    private cooldownPeriod;
    constructor();
    private initializeProviders;
    getOptimalProvider(): Promise<ethers.JsonRpcProvider>;
    markProviderUnhealthy(provider: ethers.JsonRpcProvider): void;
    private sleep;
    getProviderStatus(): any;
}
declare function executeRpcOptimization(): Promise<void>;
export { OptimizedRpcManager, executeRpcOptimization };
//# sourceMappingURL=rpcInfrastructureOptimization.d.ts.map