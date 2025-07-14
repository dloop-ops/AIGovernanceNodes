import { ethers } from 'ethers';
export declare class RpcConnectionManager {
    private providers;
    private currentProvider;
    private currentConfig;
    private readonly RATE_LIMIT_INTERVAL;
    private readonly HEALTH_CHECK_INTERVAL;
    private readonly MAX_FAILURES_BEFORE_DISABLE;
    constructor();
    getProvider(): Promise<ethers.JsonRpcProvider>;
    private isProviderUsable;
    private handleProviderFailure;
    executeContractCall<T>(contractCall: (provider: ethers.JsonRpcProvider) => Promise<T>, maxRetries?: number): Promise<T>;
    validateAllProviders(): Promise<void>;
    getProviderStatus(): any;
}
export declare const rpcManager: RpcConnectionManager;
//# sourceMappingURL=RpcConnectionManager.d.ts.map