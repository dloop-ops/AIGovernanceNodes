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
    /**
     * Get optimized gas configuration for a transaction
     */
    getOptimizedGasConfig(estimatedGas: bigint, priority?: 'low' | 'standard' | 'high'): Promise<GasConfig>;
    /**
     * Execute transaction with automatic retry and gas escalation
     */
    executeWithRetry<T>(transactionFunction: (gasConfig: GasConfig) => Promise<T>, initialGasEstimate: bigint, operationName?: string): Promise<T>;
    /**
     * Get smart gas price based on network conditions
     */
    private getSmartGasPrice;
    /**
     * Update gas price history for smart pricing
     */
    private updateGasHistory;
    /**
     * Escalate gas limit for retry attempts
     */
    private escalateGasLimit;
    /**
     * Escalate gas price for retry attempts
     */
    private escalateGasPrice;
    /**
     * Determine if we should retry based on error type
     */
    private shouldRetry;
    /**
     * Wait with exponential backoff between retries
     */
    private waitWithBackoff;
    /**
     * Get current gas metrics
     */
    getGasMetrics(): {
        historySize: number;
        averageGasPrice: string;
        lastUpdate: number;
        updateInterval: number;
    };
}
//# sourceMappingURL=GasManager.d.ts.map