export interface ProviderConfig {
    name: string;
    url: string;
    priority: number;
}
export interface NetworkStatus {
    isConnected: boolean;
    latency: number;
    blockNumber: number;
    chainId: number;
    provider: string;
    lastCheck: number;
}
export interface NetworkMetrics {
    successRate: number;
    averageLatency: number;
    totalChecks: number;
    failedChecks: number;
    lastSuccessfulCheck: number;
}
export declare class NetworkMonitor {
    private providers;
    private networkStatus;
    private metrics;
    private isMonitoring;
    private monitoringInterval;
    constructor();
    private initializeProviders;
    private startMonitoring;
    private performHealthChecks;
    private checkProviderHealth;
    private logNetworkStatus;
    private lastMetricsLog;
    private logDetailedMetrics;
    getNetworkStatus(): Map<string, NetworkStatus>;
    getHealthyProviders(): string[];
    getBestProvider(): string | null;
    getMetrics(): Map<string, NetworkMetrics>;
    isNetworkHealthy(): boolean;
    stop(): void;
}
//# sourceMappingURL=NetworkMonitor.d.ts.map