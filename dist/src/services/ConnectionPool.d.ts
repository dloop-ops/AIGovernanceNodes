import { ethers } from 'ethers';
export declare class ConnectionPool {
    private connections;
    private maxConnectionsPerEndpoint;
    private connectionTimeout;
    private healthCheckInterval;
    constructor();
    private initializeConnections;
    getHealthyConnection(): ethers.JsonRpcProvider | null;
    executeWithPool<T>(operation: (provider: ethers.JsonRpcProvider) => Promise<T>, maxRetries?: number): Promise<T>;
    private isConnectionError;
    private markConnectionUnhealthy;
    private attemptConnectionRecovery;
    private startHealthChecking;
    private performHealthChecks;
    private checkConnectionHealth;
    private delay;
    getPoolStatus(): {
        [endpointName: string]: {
            healthy: number;
            total: number;
        };
    };
    stop(): void;
}
//# sourceMappingURL=ConnectionPool.d.ts.map