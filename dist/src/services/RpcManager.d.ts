import { ethers } from 'ethers';
import { NetworkStatus } from './NetworkMonitor.js';
export interface RpcEndpoint {
    url: string;
    name: string;
    priority: number;
    maxRequestsPerSecond: number;
    lastUsed: number;
    errorCount: number;
    isHealthy: boolean;
    lastRateLimit?: number;
}
export interface RpcMetrics {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    rateLimitHits: number;
    averageResponseTime: number;
    activeProvider: string;
    poolStatus?: any;
    networkHealth?: boolean;
    healthyProviders?: number;
    connectionPoolActive?: boolean;
    networkMonitorActive?: boolean;
}
export declare class RpcManager {
    private endpoints;
    private currentProviderIndex;
    private providers;
    private requestQueue;
    private isProcessingQueue;
    private networkMonitor;
    private connectionPool;
    private metrics;
    constructor();
    private initializeEndpointsAsync;
    private initializeEndpoints;
    /**
     * Execute operation with retry logic and comprehensive rate limiting
     */
    executeWithRetry<T>(operation: (provider: ethers.JsonRpcProvider) => Promise<T>, maxRetries?: number, description?: string): Promise<T>;
    /**
     * Enhanced sequential execution for AssetDAO operations
     */
    executeSequentially<T>(operations: Array<(provider: ethers.JsonRpcProvider) => Promise<T>>, operationName?: string, delayBetweenOps?: number): Promise<T[]>;
    /**
     * Check if error is related to rate limiting
     */
    private isRateLimitError;
    /**
     * Check if error is related to batch request limits
     */
    private isBatchError;
    /**
     * Mark provider as rate limited temporarily
     */
    private markProviderRateLimited;
    /**
     * Enhanced provider health check considering rate limits
     */
    private getHealthyProvider;
    /**
     * Execute operation with timeout
     */
    private executeWithTimeout;
    /**
     * Update provider metrics
     */
    private updateProviderMetrics;
    /**
     * Simple delay helper
     */
    private delay;
    private getCurrentEndpoint;
    private getHealthyEndpoints;
    private rotateProvider;
    private updateAverageResponseTime;
    private startHealthMonitoring;
    private performHealthCheck;
    getMetrics(): RpcMetrics;
    getEndpointStatus(): Array<{
        name: string;
        isHealthy: boolean;
        errorCount: number;
        priority: number;
        lastUsed: number;
    }>;
    getCurrentProvider(): Promise<ethers.JsonRpcProvider>;
    getComprehensiveStatus(): {
        rpcManager: RpcMetrics;
        endpoints: {
            name: string;
            isHealthy: boolean;
            errorCount: number;
            priority: number;
            lastUsed: number;
        }[];
        networkStatus: [string, NetworkStatus][];
        poolStatus: {
            [endpointName: string]: {
                healthy: number;
                total: number;
            };
        };
        healthySummary: {
            totalEndpoints: number;
            healthyEndpoints: number;
            networkHealthy: boolean;
            bestProvider: string;
        };
    };
    stop(): void;
    /**
     * Enhanced endpoint initialization with network detection
     */
    private initializeEndpointsWithRetry;
}
//# sourceMappingURL=RpcManager.d.ts.map