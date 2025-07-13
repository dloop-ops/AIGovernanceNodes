import { ethers } from 'ethers';
export declare class RpcConnectionManager {
    private providers;
    private currentProvider;
    private currentConfig;
    private readonly RATE_LIMIT_INTERVAL;
    private readonly HEALTH_CHECK_INTERVAL;
    private readonly MAX_FAILURES_BEFORE_DISABLE;
    constructor();
    /**
     * Get a working RPC provider with intelligent failover
     */
    getProvider(): Promise<ethers.JsonRpcProvider>;
    /**
     * Check if provider can be used (considering rate limits and health)
     */
    private isProviderUsable;
    /**
     * Handle provider failure and update health status
     */
    private handleProviderFailure;
    /**
     * Execute contract call with automatic retry and provider switching
     */
    executeContractCall<T>(contractCall: (provider: ethers.JsonRpcProvider) => Promise<T>, maxRetries?: number): Promise<T>;
    /**
     * Get current provider status for monitoring
     */
    getProviderStatus(): any;
}
export declare const rpcManager: RpcConnectionManager;
//# sourceMappingURL=RpcConnectionManager.d.ts.map