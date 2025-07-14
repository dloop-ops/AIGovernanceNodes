"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetworkMonitor = void 0;
const ethers_1 = require("ethers");
const logger_js_1 = require("../utils/logger.js");
class NetworkMonitor {
    constructor() {
        this.providers = new Map();
        this.networkStatus = new Map();
        this.metrics = new Map();
        this.isMonitoring = false;
        this.monitoringInterval = null;
        this.lastMetricsLog = 0;
        this.initializeProviders();
        this.startMonitoring();
    }
    initializeProviders() {
        const providerConfigs = [
            {
                name: 'Primary Infura',
                url: process.env.INFURA_SEPOLIA_URL || 'https://sepolia.infura.io/v3/ca485bd6567e4c5fb5693ee66a5885d8',
                priority: 1
            },
            {
                name: 'Secondary Infura',
                url: 'https://sepolia.infura.io/v3/60755064a92543a1ac7aaf4e20b71cdf',
                priority: 2
            },
            {
                name: 'Tenderly',
                url: 'https://sepolia.gateway.tenderly.co/public',
                priority: 3
            },
            {
                name: 'Ethereum Public',
                url: 'https://ethereum-sepolia-rpc.publicnode.com',
                priority: 4
            }
        ];
        providerConfigs.forEach((endpoint, index) => {
            if (endpoint.url && !endpoint.url.includes('undefined')) {
                try {
                    setTimeout(() => {
                        try {
                            const provider = new ethers_1.ethers.JsonRpcProvider(endpoint.url);
                            this.providers.set(endpoint.name, provider);
                            this.metrics.set(endpoint.name, {
                                successRate: 0,
                                averageLatency: 0,
                                totalChecks: 0,
                                failedChecks: 0,
                                lastSuccessfulCheck: 0
                            });
                            logger_js_1.walletLogger.debug('Provider initialized for monitoring', {
                                component: 'contract',
                                provider: endpoint.name,
                                url: endpoint.url.substring(0, 50) + '...'
                            });
                        }
                        catch (error) {
                            logger_js_1.walletLogger.warn('Failed to initialize provider for monitoring', {
                                component: 'contract',
                                provider: endpoint.name,
                                error: error instanceof Error ? error.message : 'Unknown error'
                            });
                        }
                    }, index * 300);
                }
                catch (error) {
                    logger_js_1.walletLogger.warn('Failed to schedule provider initialization for monitoring', {
                        component: 'contract',
                        provider: endpoint.name,
                        error: error instanceof Error ? error.message : 'Unknown error'
                    });
                }
            }
        });
    }
    startMonitoring() {
        if (this.isMonitoring)
            return;
        this.isMonitoring = true;
        logger_js_1.walletLogger.info('Starting network monitoring');
        this.monitoringInterval = setInterval(() => {
            this.performHealthChecks();
        }, 30000);
        this.performHealthChecks();
    }
    async performHealthChecks() {
        const providers = Array.from(this.providers.entries());
        for (const [name, provider] of providers) {
            try {
                await this.checkProviderHealth(name, provider);
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            catch (error) {
                logger_js_1.walletLogger.debug('Health check failed for provider', { provider: name, error });
            }
        }
        this.logNetworkStatus();
    }
    async checkProviderHealth(name, provider) {
        const startTime = Date.now();
        const metrics = this.metrics.get(name);
        try {
            metrics.totalChecks++;
            const [blockNumber, chainId] = await Promise.all([
                provider.getBlockNumber(),
                provider.getNetwork().then(network => Number(network.chainId))
            ]);
            const latency = Date.now() - startTime;
            const now = Date.now();
            this.networkStatus.set(name, {
                isConnected: true,
                latency,
                blockNumber,
                chainId,
                provider: name,
                lastCheck: now
            });
            metrics.lastSuccessfulCheck = now;
            metrics.averageLatency = (metrics.averageLatency + latency) / 2;
            metrics.successRate = ((metrics.totalChecks - metrics.failedChecks) / metrics.totalChecks) * 100;
            logger_js_1.walletLogger.debug('Provider health check passed', {
                provider: name,
                latency,
                blockNumber,
                chainId
            });
        }
        catch (error) {
            metrics.failedChecks++;
            metrics.successRate = ((metrics.totalChecks - metrics.failedChecks) / metrics.totalChecks) * 100;
            this.networkStatus.set(name, {
                isConnected: false,
                latency: -1,
                blockNumber: -1,
                chainId: -1,
                provider: name,
                lastCheck: Date.now()
            });
            logger_js_1.walletLogger.warn('Provider health check failed', {
                provider: name,
                error: error instanceof Error ? error.message : 'Unknown error',
                failureRate: (metrics.failedChecks / metrics.totalChecks) * 100
            });
        }
    }
    logNetworkStatus() {
        const statuses = Array.from(this.networkStatus.values());
        const connected = statuses.filter(s => s.isConnected);
        const disconnected = statuses.filter(s => !s.isConnected);
        if (connected.length === 0) {
            logger_js_1.walletLogger.error('All RPC providers are disconnected', {
                totalProviders: statuses.length,
                connectedProviders: 0
            });
        }
        else if (disconnected.length > 0) {
            logger_js_1.walletLogger.warn('Some RPC providers are experiencing issues', {
                totalProviders: statuses.length,
                connectedProviders: connected.length,
                disconnectedProviders: disconnected.length,
                healthyProviders: connected.map(s => s.provider)
            });
        }
        const now = Date.now();
        const fiveMinutes = 5 * 60 * 1000;
        if (!this.lastMetricsLog || (now - this.lastMetricsLog) > fiveMinutes) {
            this.logDetailedMetrics();
            this.lastMetricsLog = now;
        }
    }
    logDetailedMetrics() {
        const metricsReport = Array.from(this.metrics.entries()).map(([name, metrics]) => ({
            provider: name,
            successRate: Math.round(metrics.successRate * 100) / 100,
            averageLatency: Math.round(metrics.averageLatency),
            totalChecks: metrics.totalChecks,
            timeSinceLastSuccess: metrics.lastSuccessfulCheck
                ? Math.round((Date.now() - metrics.lastSuccessfulCheck) / 1000)
                : -1
        }));
        logger_js_1.walletLogger.info('Network monitoring metrics', {
            providers: metricsReport,
            monitoringActive: this.isMonitoring
        });
    }
    getNetworkStatus() {
        return new Map(this.networkStatus);
    }
    getHealthyProviders() {
        return Array.from(this.networkStatus.entries())
            .filter(([_name, status]) => status.isConnected)
            .map(([name, _status]) => name);
    }
    getBestProvider() {
        const healthyProviders = Array.from(this.networkStatus.entries())
            .filter(([_name, status]) => status.isConnected)
            .sort(([_name1, a], [_name2, b]) => a.latency - b.latency);
        return healthyProviders.length > 0 ? healthyProviders[0][0] : null;
    }
    getMetrics() {
        return new Map(this.metrics);
    }
    isNetworkHealthy() {
        const healthyCount = this.getHealthyProviders().length;
        const totalCount = this.providers.size;
        return healthyCount > 0 && (healthyCount / totalCount) >= 0.25;
    }
    stop() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        this.isMonitoring = false;
        logger_js_1.walletLogger.info('Network monitoring stopped');
    }
}
exports.NetworkMonitor = NetworkMonitor;
//# sourceMappingURL=NetworkMonitor.js.map