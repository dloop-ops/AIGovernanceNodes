import { ethers } from 'ethers';
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
    executeWithRetry<T>(operation: (provider: ethers.JsonRpcProvider) => Promise<T>, maxRetries?: number, description?: string): Promise<T>;
    executeSequentially<T>(operations: Array<(provider: ethers.JsonRpcProvider) => Promise<T>>, operationName?: string, delayBetweenOps?: number): Promise<T[]>;
    private isRateLimitError;
    private isBatchError;
    private markProviderRateLimited;
    private getHealthyProvider;
    private executeWithTimeout;
    private updateProviderMetrics;
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
        networkStatus: [string, import("./NetworkMonitor.js").NetworkStatus][];
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
            bestProvider: string | null;
        };
    };
    stop(): void;
    private initializeEndpointsWithRetry;
}
//# sourceMappingURL=RpcManager.d.ts.map