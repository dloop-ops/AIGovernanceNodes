"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RpcManager = void 0;
const ethers_1 = require("ethers");
const logger_js_1 = require("../utils/logger.js");
const NetworkMonitor_js_1 = require("./NetworkMonitor.js");
const ConnectionPool_js_1 = require("./ConnectionPool.js");
class RpcManager {
    constructor() {
        this.endpoints = [];
        this.currentProviderIndex = 0;
        this.providers = new Map();
        this.requestQueue = [];
        this.isProcessingQueue = false;
        this.metrics = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            rateLimitHits: 0,
            averageResponseTime: 0,
            activeProvider: ''
        };
        this.networkMonitor = new NetworkMonitor_js_1.NetworkMonitor();
        this.connectionPool = new ConnectionPool_js_1.ConnectionPool();
        this.initializeEndpointsAsync();
        this.startHealthMonitoring();
    }
    async initializeEndpointsAsync() {
        try {
            await this.initializeEndpointsWithRetry();
        }
        catch (error) {
            logger_js_1.contractLogger.warn('Enhanced initialization failed, falling back to original method', {
                component: 'contract',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            this.initializeEndpoints();
        }
    }
    initializeEndpoints() {
        const networkName = process.env.NETWORK_NAME || 'sepolia';
        this.endpoints = [
            {
                url: process.env.INFURA_SEPOLIA_URL || 'https://sepolia.infura.io/v3/ca485bd6567e4c5fb5693ee66a5885d8',
                name: 'Primary Infura',
                priority: 1,
                maxRequestsPerSecond: parseInt(process.env.API_RATE_LIMIT_PER_MINUTE || '60') / 60,
                lastUsed: 0,
                errorCount: 0,
                isHealthy: true
            },
            {
                url: 'https://sepolia.infura.io/v3/60755064a92543a1ac7aaf4e20b71cdf',
                name: 'Secondary Infura',
                priority: 2,
                maxRequestsPerSecond: parseInt(process.env.API_RATE_LIMIT_PER_MINUTE || '60') / 60,
                lastUsed: 0,
                errorCount: 0,
                isHealthy: true
            },
            {
                url: 'https://sepolia.gateway.tenderly.co/public',
                name: 'Tenderly Public',
                priority: 3,
                maxRequestsPerSecond: 5,
                lastUsed: 0,
                errorCount: 0,
                isHealthy: true
            },
            {
                url: 'https://ethereum-sepolia-rpc.publicnode.com',
                name: 'PublicNode',
                priority: 4,
                maxRequestsPerSecond: 3,
                lastUsed: 0,
                errorCount: 0,
                isHealthy: true
            }
        ];
        this.endpoints = this.endpoints.filter(endpoint => endpoint.url &&
            endpoint.url !== '' &&
            !endpoint.url.includes('demo') &&
            !endpoint.url.includes('undefined'));
        this.endpoints.forEach((endpoint, index) => {
            try {
                setTimeout(() => {
                    try {
                        const provider = new ethers_1.ethers.JsonRpcProvider(endpoint.url, {
                            name: 'sepolia',
                            chainId: 11155111
                        });
                        this.providers.set(endpoint.name, provider);
                        logger_js_1.contractLogger.info('RPC endpoint initialized', {
                            component: 'contract',
                            name: endpoint.name,
                            priority: endpoint.priority
                        });
                    }
                    catch (error) {
                        logger_js_1.contractLogger.warn('Failed to initialize RPC endpoint', {
                            component: 'contract',
                            name: endpoint.name,
                            error: error instanceof Error ? error.message : 'Unknown error'
                        });
                        endpoint.isHealthy = false;
                    }
                }, index * 200);
            }
            catch (error) {
                logger_js_1.contractLogger.warn('Failed to schedule RPC endpoint initialization', {
                    component: 'contract',
                    name: endpoint.name,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
                endpoint.isHealthy = false;
            }
        });
        if (this.endpoints.length === 0) {
            logger_js_1.contractLogger.error('No valid RPC endpoints configured', { component: 'contract' });
            throw new Error('No valid RPC endpoints available');
        }
        this.endpoints.sort((a, b) => a.priority - b.priority);
        this.metrics.activeProvider = this.endpoints[0]?.name || 'Unknown';
        logger_js_1.contractLogger.info('RPC Manager initialized', {
            component: 'contract',
            totalEndpoints: this.endpoints.length,
            healthyEndpoints: this.endpoints.filter(e => e.isHealthy).length,
            activeProvider: this.metrics.activeProvider
        });
    }
    async executeWithRetry(operation, maxRetries = 3, description = 'RPC operation') {
        let lastError = null;
        await this.delay(Math.random() * 2000 + 1000);
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const provider = await this.getCurrentProvider();
                const now = Date.now();
                const endpoint = this.endpoints.find(e => e.name === this.metrics.activeProvider);
                if (endpoint) {
                    const timeSinceLastUse = now - endpoint.lastUsed;
                    const minInterval = Math.max(2000, 1000 / (endpoint.maxRequestsPerSecond || 0.5));
                    if (timeSinceLastUse < minInterval) {
                        await this.delay(minInterval - timeSinceLastUse + 500);
                    }
                    endpoint.lastUsed = now;
                }
                const result = await Promise.race([
                    operation(provider),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Operation timeout')), 15000))
                ]);
                if (endpoint) {
                    endpoint.errorCount = 0;
                }
                this.metrics.successfulRequests++;
                logger_js_1.contractLogger.debug(`${description} succeeded`, {
                    component: 'contract',
                    provider: this.metrics.activeProvider,
                    attempt
                });
                return result;
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                const errorMessage = lastError.message.toLowerCase();
                const isRateLimit = errorMessage.includes('too many requests') ||
                    errorMessage.includes('rate limit') ||
                    errorMessage.includes('batch of more than 3') ||
                    errorMessage.includes('missing response for request') ||
                    errorMessage.includes('bad_data') ||
                    errorMessage.includes('-32005') ||
                    errorMessage.includes('429');
                const isNetworkError = errorMessage.includes('failed to detect network') ||
                    errorMessage.includes('cannot start up') ||
                    errorMessage.includes('network error') ||
                    errorMessage.includes('enotfound') ||
                    errorMessage.includes('timeout');
                if (isRateLimit) {
                    this.metrics.rateLimitHits++;
                    logger_js_1.contractLogger.warn(`Rate limit detected, rotating provider`, {
                        component: 'contract',
                        error: lastError.message.substring(0, 100),
                        currentProvider: this.metrics.activeProvider
                    });
                    this.rotateProvider('Rate limit detected');
                    await this.delay(3000 + (attempt * 2000));
                }
                else if (isNetworkError) {
                    logger_js_1.contractLogger.warn(`Network error detected, rotating provider`, {
                        component: 'contract',
                        error: lastError.message.substring(0, 100),
                        currentProvider: this.metrics.activeProvider
                    });
                    this.rotateProvider('Network error detected');
                    await this.delay(2000 + (attempt * 1500));
                }
                else {
                    await this.delay(1500 * attempt);
                }
                this.metrics.failedRequests++;
                logger_js_1.contractLogger.warn(`${description} attempt ${attempt}/${maxRetries} failed`, {
                    component: 'contract',
                    provider: this.metrics.activeProvider,
                    error: lastError.message.substring(0, 100),
                    isRateLimit,
                    isNetworkError
                });
                const endpoint = this.endpoints.find(e => e.name === this.metrics.activeProvider);
                if (endpoint) {
                    endpoint.errorCount++;
                    if (endpoint.errorCount >= 2) {
                        endpoint.isHealthy = false;
                        logger_js_1.contractLogger.warn(`Marking provider as unhealthy`, {
                            component: 'contract',
                            provider: this.metrics.activeProvider,
                            errorCount: endpoint.errorCount
                        });
                        this.rotateProvider('Provider marked unhealthy');
                    }
                }
            }
        }
        throw new Error(`${description} failed after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
    }
    async executeSequentially(operations, operationName = 'Sequential Operations', delayBetweenOps = 400) {
        const results = [];
        logger_js_1.contractLogger.info(`Starting sequential execution of ${operations.length} ${operationName} operations`);
        for (let i = 0; i < operations.length; i++) {
            try {
                if (i > 0) {
                    const delay = delayBetweenOps + (i * 50);
                    await this.delay(Math.min(delay, 1000));
                }
                const result = await this.executeWithRetry(operations[i], 2, `${operationName} ${i + 1}/${operations.length}`);
                results.push(result);
                if (operations.length > 10 && (i + 1) % 10 === 0) {
                    logger_js_1.contractLogger.info(`Sequential progress: ${i + 1}/${operations.length} completed`);
                }
            }
            catch (error) {
                logger_js_1.contractLogger.error(`Sequential operation ${i + 1} failed:`, {
                    error: error instanceof Error ? error.message : String(error),
                    operationName
                });
                if (operationName.includes('AssetDAO') || operationName.includes('Proposal')) {
                    logger_js_1.contractLogger.warn(`Continuing sequential execution despite failure at index ${i}`);
                    continue;
                }
                else {
                    throw error;
                }
            }
        }
        logger_js_1.contractLogger.info(`Sequential execution completed: ${results.length}/${operations.length} succeeded`);
        return results;
    }
    isRateLimitError(error) {
        const errorStr = String(error.message || error).toLowerCase();
        return errorStr.includes('too many requests') ||
            errorStr.includes('rate limit') ||
            errorStr.includes('-32005') ||
            errorStr.includes('429');
    }
    isBatchError(error) {
        const errorStr = String(error.message || error).toLowerCase();
        return errorStr.includes('batch of more than') ||
            errorStr.includes('batch request') ||
            errorStr.includes('free tier');
    }
    markProviderRateLimited(providerName) {
        const endpoint = this.endpoints.find(e => e.name === providerName);
        if (endpoint) {
            endpoint.lastRateLimit = Date.now();
            logger_js_1.contractLogger.info(`Marked ${providerName} as rate limited temporarily`);
            this.rotateProvider('Rate limit detected');
        }
    }
    getHealthyProvider() {
        const now = Date.now();
        const rateLimitCooldown = 60000;
        for (const endpoint of this.endpoints) {
            const isRateLimited = endpoint.lastRateLimit &&
                (now - endpoint.lastRateLimit) < rateLimitCooldown;
            if (endpoint.isHealthy && !isRateLimited) {
                const provider = this.providers.get(endpoint.name);
                if (provider) {
                    return {
                        name: endpoint.name,
                        provider: provider
                    };
                }
            }
        }
        const leastRecentlyLimited = this.endpoints
            .filter(e => e.isHealthy)
            .sort((a, b) => (a.lastRateLimit || 0) - (b.lastRateLimit || 0))[0];
        if (leastRecentlyLimited) {
            logger_js_1.contractLogger.warn(`All providers rate limited, using least recently limited: ${leastRecentlyLimited.name}`);
            const provider = this.providers.get(leastRecentlyLimited.name);
            if (provider) {
                return {
                    name: leastRecentlyLimited.name,
                    provider: provider
                };
            }
        }
        return null;
    }
    executeWithTimeout(operation, timeoutMs) {
        return Promise.race([
            operation,
            new Promise((_, reject) => setTimeout(() => reject(new Error(`Operation timeout after ${timeoutMs}ms`)), timeoutMs))
        ]);
    }
    updateProviderMetrics(providerName, success) {
        const endpoint = this.endpoints.find(e => e.name === providerName);
        if (endpoint) {
            if (success) {
                endpoint.errorCount = Math.max(0, endpoint.errorCount - 1);
                endpoint.lastUsed = Date.now();
                this.metrics.successfulRequests++;
            }
            else {
                endpoint.errorCount++;
                this.metrics.failedRequests++;
            }
            this.metrics.totalRequests++;
        }
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    getCurrentEndpoint() {
        const healthyEndpoints = this.getHealthyEndpoints();
        if (healthyEndpoints.length === 0) {
            logger_js_1.contractLogger.warn('No healthy endpoints available, resetting all endpoints');
            this.endpoints.forEach(endpoint => {
                endpoint.isHealthy = true;
                endpoint.errorCount = 0;
            });
            return this.endpoints[0];
        }
        return healthyEndpoints[this.currentProviderIndex % healthyEndpoints.length];
    }
    getHealthyEndpoints() {
        return this.endpoints.filter(endpoint => endpoint.isHealthy);
    }
    rotateProvider(reason) {
        const previousProvider = this.getCurrentEndpoint().name;
        this.currentProviderIndex = (this.currentProviderIndex + 1) % this.getHealthyEndpoints().length;
        const newProvider = this.getCurrentEndpoint().name;
        logger_js_1.contractLogger.info('Rotating RPC provider', {
            reason,
            from: previousProvider,
            to: newProvider,
            healthyEndpoints: this.getHealthyEndpoints().length
        });
        this.metrics.activeProvider = newProvider;
    }
    updateAverageResponseTime(responseTime) {
        const weight = 0.1;
        this.metrics.averageResponseTime =
            this.metrics.averageResponseTime * (1 - weight) + responseTime * weight;
    }
    startHealthMonitoring() {
        setInterval(async () => {
            await this.performHealthCheck();
        }, 5 * 60 * 1000);
        setInterval(() => {
            this.endpoints.forEach(endpoint => {
                endpoint.errorCount = Math.max(0, endpoint.errorCount - 1);
                if (endpoint.errorCount === 0 && !endpoint.isHealthy) {
                    endpoint.isHealthy = true;
                    logger_js_1.contractLogger.info('Endpoint recovered', { provider: endpoint.name });
                }
            });
        }, 60 * 60 * 1000);
    }
    async performHealthCheck() {
        logger_js_1.contractLogger.debug('Performing RPC health check');
        for (const endpoint of this.endpoints) {
            const provider = this.providers.get(endpoint.name);
            if (!provider)
                continue;
            try {
                const startTime = Date.now();
                await provider.getBlockNumber();
                const responseTime = Date.now() - startTime;
                if (responseTime < 10000) {
                    endpoint.isHealthy = true;
                    endpoint.errorCount = Math.max(0, endpoint.errorCount - 1);
                }
                logger_js_1.contractLogger.debug('Health check passed', {
                    provider: endpoint.name,
                    responseTime,
                    errorCount: endpoint.errorCount
                });
            }
            catch (error) {
                endpoint.errorCount++;
                if (endpoint.errorCount >= 3) {
                    endpoint.isHealthy = false;
                }
                logger_js_1.contractLogger.warn('Health check failed', {
                    provider: endpoint.name,
                    errorCount: endpoint.errorCount,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }
    }
    getMetrics() {
        const poolStatus = this.connectionPool.getPoolStatus();
        const networkHealth = this.networkMonitor.isNetworkHealthy();
        const healthyProviders = this.networkMonitor.getHealthyProviders().length;
        return {
            ...this.metrics,
            poolStatus: poolStatus,
            networkHealth: networkHealth,
            healthyProviders: healthyProviders,
            connectionPoolActive: true,
            networkMonitorActive: true
        };
    }
    getEndpointStatus() {
        return this.endpoints.map(endpoint => ({
            name: endpoint.name,
            isHealthy: endpoint.isHealthy,
            errorCount: endpoint.errorCount,
            priority: endpoint.priority,
            lastUsed: endpoint.lastUsed
        }));
    }
    async getCurrentProvider() {
        const poolConnection = await this.connectionPool.getHealthyConnection();
        if (poolConnection) {
            logger_js_1.contractLogger.debug('Using connection pool provider');
            return poolConnection;
        }
        const endpoint = this.getCurrentEndpoint();
        const provider = this.providers.get(endpoint.name);
        if (!provider) {
            throw new Error(`Provider not found for endpoint: ${endpoint.name}`);
        }
        logger_js_1.contractLogger.debug('Using traditional provider fallback', { provider: endpoint.name });
        return provider;
    }
    getComprehensiveStatus() {
        return {
            rpcManager: this.getMetrics(),
            endpoints: this.getEndpointStatus(),
            networkStatus: Array.from(this.networkMonitor.getNetworkStatus().entries()),
            poolStatus: this.connectionPool.getPoolStatus(),
            healthySummary: {
                totalEndpoints: this.endpoints.length,
                healthyEndpoints: this.endpoints.filter(e => e.isHealthy).length,
                networkHealthy: this.networkMonitor.isNetworkHealthy(),
                bestProvider: this.networkMonitor.getBestProvider()
            }
        };
    }
    stop() {
        this.networkMonitor.stop();
        this.connectionPool.stop();
        logger_js_1.contractLogger.info('RPC Manager stopped with all monitoring services');
    }
    async initializeEndpointsWithRetry() {
        logger_js_1.contractLogger.info('Initializing RPC endpoints with enhanced error handling', {
            component: 'contract'
        });
        const networkName = process.env.NETWORK_NAME || 'sepolia';
        const endpointConfigs = [
            {
                url: process.env.ETHEREUM_RPC_URL || process.env.INFURA_SEPOLIA_URL || 'https://sepolia.infura.io/v3/ca485bd6567e4c5fb5693ee66a5885d8',
                name: 'Primary RPC',
                priority: 1,
                maxRequestsPerSecond: 0.5,
                lastUsed: 0,
                errorCount: 0,
                isHealthy: true
            },
            {
                url: 'https://sepolia.infura.io/v3/60755064a92543a1ac7aaf4e20b71cdf',
                name: 'Secondary Infura',
                priority: 2,
                maxRequestsPerSecond: 0.4,
                lastUsed: 0,
                errorCount: 0,
                isHealthy: true
            },
            {
                url: 'https://sepolia.gateway.tenderly.co/public',
                name: 'Tenderly Public',
                priority: 3,
                maxRequestsPerSecond: 0.3,
                lastUsed: 0,
                errorCount: 0,
                isHealthy: true
            },
            {
                url: 'https://ethereum-sepolia-rpc.publicnode.com',
                name: 'PublicNode',
                priority: 4,
                maxRequestsPerSecond: 0.2,
                lastUsed: 0,
                errorCount: 0,
                isHealthy: true
            },
            {
                url: 'https://rpc.sepolia.org',
                name: 'Sepolia.org',
                priority: 5,
                maxRequestsPerSecond: 0.2,
                lastUsed: 0,
                errorCount: 0,
                isHealthy: true
            }
        ];
        const validConfigs = endpointConfigs.filter(config => config.url &&
            config.url !== '' &&
            !config.url.includes('undefined'));
        for (const config of validConfigs) {
            try {
                const initDelay = (config.priority - 1) * 2000;
                if (initDelay > 0) {
                    await new Promise(resolve => setTimeout(resolve, initDelay));
                }
                logger_js_1.contractLogger.info('Initializing RPC endpoint', {
                    component: 'contract',
                    name: config.name,
                    priority: config.priority
                });
                const provider = new ethers_1.ethers.JsonRpcProvider(config.url, {
                    name: 'sepolia',
                    chainId: 11155111
                });
                let connected = false;
                let lastError = null;
                for (let attempt = 1; attempt <= 3; attempt++) {
                    try {
                        const blockNumber = await Promise.race([
                            provider.getBlockNumber(),
                            new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), 12000))
                        ]);
                        if (blockNumber > 0) {
                            connected = true;
                            logger_js_1.contractLogger.info('Provider connectivity confirmed', {
                                component: 'contract',
                                provider: config.name,
                                blockNumber
                            });
                            break;
                        }
                    }
                    catch (error) {
                        lastError = error;
                        if (error.message && (error.message.includes('Unauthorized') ||
                            error.message.includes('API key') ||
                            error.message.includes('invalid URL'))) {
                            logger_js_1.contractLogger.warn(`Provider has permanent issue, skipping`, {
                                component: 'contract',
                                provider: config.name,
                                error: error.message?.substring(0, 100)
                            });
                            break;
                        }
                        logger_js_1.contractLogger.warn(`Provider test failed (attempt ${attempt}/3)`, {
                            component: 'contract',
                            provider: config.name,
                            error: error.message?.substring(0, 100)
                        });
                        if (attempt < 3) {
                            await new Promise(resolve => setTimeout(resolve, attempt * 2000));
                        }
                    }
                }
                if (connected) {
                    this.endpoints.push(config);
                    this.providers.set(config.name, provider);
                    logger_js_1.contractLogger.info('RPC endpoint initialized successfully', {
                        component: 'contract',
                        name: config.name,
                        priority: config.priority
                    });
                }
                else {
                    logger_js_1.contractLogger.warn('Failed to initialize RPC endpoint after retries', {
                        component: 'contract',
                        name: config.name,
                        error: lastError && typeof lastError === 'object' && 'message' in lastError
                            ? lastError.message?.substring(0, 100)
                            : 'Unknown error'
                    });
                }
            }
            catch (error) {
                logger_js_1.contractLogger.error('Failed to initialize RPC endpoint', {
                    component: 'contract',
                    name: config.name,
                    error: error.message
                });
            }
        }
        if (this.endpoints.length === 0) {
            logger_js_1.contractLogger.error('No valid RPC endpoints configured', { component: 'contract' });
            throw new Error('No valid RPC endpoints available');
        }
        this.endpoints.sort((a, b) => a.priority - b.priority);
        this.metrics.activeProvider = this.endpoints[0]?.name || 'Unknown';
        logger_js_1.contractLogger.info('RPC Manager initialization completed', {
            component: 'contract',
            totalEndpoints: this.endpoints.length,
            healthyEndpoints: this.endpoints.filter(e => e.isHealthy).length,
            activeProvider: this.metrics.activeProvider
        });
    }
}
exports.RpcManager = RpcManager;
//# sourceMappingURL=RpcManager.js.map