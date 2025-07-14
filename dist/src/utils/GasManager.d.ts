import { ethers } from 'ethers';
export interface GasConfig {
    maxFeePerGas?: bigint;
    maxPriorityFeePerGas?: bigint;
    gasPrice?: bigint;
    gasLimit: bigint;
    retryMultiplier: number;
    maxRetries: number;
}
export interface RetryConfig {
    attempt: number;
    maxAttempts: number;
    baseGasIncrease: number;
    maxGasIncrease: number;
    delayMs: number;
}
export declare class GasManager {
    private provider;
    private gasHistory;
    private readonly historySize;
    private lastUpdate;
    private readonly updateInterval;
    constructor(provider: ethers.Provider);
    getOptimizedGasConfig(estimatedGas: bigint, priority?: 'low' | 'standard' | 'high'): Promise<GasConfig>;
    executeWithRetry<T>(transactionFunction: (gasConfig: GasConfig) => Promise<T>, initialGasEstimate: bigint, operationName?: string): Promise<T>;
    private getSmartGasPrice;
    private updateGasHistory;
    private escalateGasLimit;
    private escalateGasPrice;
    private shouldRetry;
    private waitWithBackoff;
    getGasMetrics(): {
        historySize: number;
        averageGasPrice: string;
        lastUpdate: number;
        updateInterval: number;
    };
}
//# sourceMappingURL=GasManager.d.ts.map