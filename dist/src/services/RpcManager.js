import { ethers } from 'ethers';
import { contractLogger as logger } from '../utils/logger.js';
import { NetworkMonitor } from './NetworkMonitor.js';
import { ConnectionPool } from './ConnectionPool.js';
export class RpcManager {
    endpoints = [];
    currentProviderIndex = 0;
    providers = new Map();
    requestQueue = [];
    isProcessingQueue = false;
    networkMonitor;
    connectionPool;
    metrics = {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        rateLimitHits: 0,
        averageResponseTime: 0,
        activeProvider: ''
    };
    constructor() {
        this.networkMonitor = new NetworkMonitor();
        this.connectionPool = new ConnectionPool();
        // Initialize endpoints asynchronously to handle network detection properly
        this.initializeEndpointsAsync();
        this.startHealthMonitoring();
    }
    async initializeEndpointsAsync() {
        try {
            // First try the new enhanced initialization
            await this.initializeEndpointsWithRetry();
        }
        catch (error) {
            logger.warn('Enhanced initialization failed, falling back to original method', {
                component: 'contract',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            // Fallback to original initialization
            this.initializeEndpoints();
        }
    }
    initializeEndpoints() {
        const networkName = process.env.NETWORK_NAME || 'sepolia';
        // Primary endpoints with multiple Infura keys for load balancing
        // Removed Ankr endpoint due to API key requirements
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
                maxRequestsPerSecond: 5, // Conservative rate limit for public endpoint
                lastUsed: 0,
                errorCount: 0,
                isHealthy: true
            },
            {
                url: 'https://ethereum-sepolia-rpc.publicnode.com',
                name: 'PublicNode',
                priority: 4,
                maxRequestsPerSecond: 3, // Very conservative for public endpoint
                lastUsed: 0,
                errorCount: 0,
                isHealthy: true
            }
        ];
        // Filter out endpoints without valid URLs
        this.endpoints = this.endpoints.filter(endpoint => endpoint.url &&
            endpoint.url !== '' &&
            !endpoint.url.includes('demo') &&
            !endpoint.url.includes('undefined'));
        // Initialize providers with proper network configuration
        this.endpoints.forEach((endpoint, index) => {
            try {
                // Add progressive delay to avoid concurrent initialization issues
                setTimeout(() => {
                    try {
                        const provider = new ethers.JsonRpcProvider(endpoint.url, {
                            name: 'sepolia',
                            chainId: 11155111
                        });
                        this.providers.set(endpoint.name, provider);
                        logger.info('RPC endpoint initialized', {
                            component: 'contract',
                            name: endpoint.name,
                            priority: endpoint.priority
                        });
                    }
                    catch (error) {
                        logger.warn('Failed to initialize RPC endpoint', {
                            component: 'contract',
                            name: endpoint.name,
                            error: error instanceof Error ? error.message : 'Unknown error'
                        });
                        endpoint.isHealthy = false;
                    }
                }, index * 200); // 200ms delay between each provider initialization
            }
            catch (error) {
                logger.warn('Failed to schedule RPC endpoint initialization', {
                    component: 'contract',
                    name: endpoint.name,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
                endpoint.isHealthy = false;
            }
        });
        if (this.endpoints.length === 0) {
            logger.error('No valid RPC endpoints configured', { component: 'contract' });
            throw new Error('No valid RPC endpoints available');
        }
        // Sort by priority
        this.endpoints.sort((a, b) => a.priority - b.priority);
        this.metrics.activeProvider = this.endpoints[0]?.name || 'Unknown';
        logger.info('RPC Manager initialized', {
            component: 'contract',
            totalEndpoints: this.endpoints.length,
            healthyEndpoints: this.endpoints.filter(e => e.isHealthy).length,
            activeProvider: this.metrics.activeProvider
        });
    }
    /**
     * Execute operation with retry logic and comprehensive rate limiting
     */
    async executeWithRetry(operation, maxRetries = 3, description = 'RPC operation') {
        let lastError = null;
        // Add longer delay before any RPC operation to prevent rate limiting
        await this.delay(Math.random() * 1000 + 500); // 500-1500ms delay
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                // Get current provider and enforce rate limiting
                const provider = await this.getCurrentProvider();
                // Ensure minimum time between requests (more aggressive)
                const now = Date.now();
                const endpoint = this.endpoints.find(e => e.name === this.metrics.activeProvider);
                if (endpoint) {
                    const timeSinceLastUse = now - endpoint.lastUsed;
                    const minInterval = 1000 / (endpoint.maxRequestsPerSecond || 1); // Minimum time between requests
                    if (timeSinceLastUse < minInterval) {
                        await this.delay(minInterval - timeSinceLastUse + 100); // Extra 100ms buffer
                    }
                    endpoint.lastUsed = now;
                }
                // Execute the operation with timeout
                const result = await Promise.race([
                    operation(provider),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Operation timeout')), 10000) // 10s timeout
                    )
                ]);
                // Reset error count on success
                if (endpoint) {
                    endpoint.errorCount = 0;
                }
                return result;
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                // Check if this is a rate limiting error
                const errorMessage = lastError.message.toLowerCase();
                const isRateLimit = errorMessage.includes('too many requests') ||
                    errorMessage.includes('rate limit') ||
                    errorMessage.includes('batch of more than 3') ||
                    errorMessage.includes('missing response for request') ||
                    errorMessage.includes('bad_data');
                // Check if this is drpc.org (which we want to avoid completely)
                const isDrpcError = errorMessage.includes('drpc.org');
                if (isDrpcError) {
                    logger.error('🚫 Detected drpc.org usage - rotating provider immediately', {
                        component: 'contract',
                        error: lastError.message,
                        currentProvider: this.metrics.activeProvider
                    });
                }
                if (isRateLimit || isDrpcError) {
                    this.rotateProvider('Rate limit or drpc.org detected');
                    await this.delay(2000 + (attempt * 1000)); // Exponential backoff: 3s, 4s, 5s
                }
                else {
                    await this.delay(1000 * attempt); // Regular backoff: 1s, 2s, 3s
                }
                logger.warn(`${description} attempt ${attempt}/${maxRetries} failed`, {
                    component: 'contract',
                    provider: this.metrics.activeProvider,
                    error: lastError.message,
                    isRateLimit,
                    isDrpcError
                });
                // Mark endpoint as unhealthy if too many errors
                const endpoint = this.endpoints.find(e => e.name === this.metrics.activeProvider);
                if (endpoint) {
                    endpoint.errorCount++;
                    if (endpoint.errorCount >= 3) {
                        endpoint.isHealthy = false;
                        logger.warn(`Marking provider as unhealthy`, {
                            component: 'contract',
                            provider: this.metrics.activeProvider,
                            errorCount: endpoint.errorCount
                        });
                    }
                }
            }
        }
        throw new Error(`${description} failed after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
    }
    /**
     * Enhanced sequential execution for AssetDAO operations
     */
    async executeSequentially(operations, operationName = 'Sequential Operations', delayBetweenOps = 400) {
        const results = [];
        logger.info(`Starting sequential execution of ${operations.length} ${operationName} operations`);
        for (let i = 0; i < operations.length; i++) {
            try {
                // Add progressive delay for AssetDAO operations
                if (i > 0) {
                    const delay = delayBetweenOps + (i * 50); // Progressive delay
                    await this.delay(Math.min(delay, 1000));
                }
                const result = await this.executeWithRetry(operations[i], 2, // Reduced retries for sequential ops
                `${operationName} ${i + 1}/${operations.length}`);
                results.push(result);
                // Log progress for long operations
                if (operations.length > 10 && (i + 1) % 10 === 0) {
                    logger.info(`Sequential progress: ${i + 1}/${operations.length} completed`);
                }
            }
            catch (error) {
                logger.error(`Sequential operation ${i + 1} failed:`, {
                    error: error instanceof Error ? error.message : String(error),
                    operationName
                });
                // For critical operations like proposal fetching, continue with next
                if (operationName.includes('AssetDAO') || operationName.includes('Proposal')) {
                    logger.warn(`Continuing sequential execution despite failure at index ${i}`);
                    continue;
                }
                else {
                    throw error;
                }
            }
        }
        logger.info(`Sequential execution completed: ${results.length}/${operations.length} succeeded`);
        return results;
    }
    /**
     * Check if error is related to rate limiting
     */
    isRateLimitError(error) {
        const errorStr = String(error.message || error).toLowerCase();
        return errorStr.includes('too many requests') ||
            errorStr.includes('rate limit') ||
            errorStr.includes('-32005') ||
            errorStr.includes('429');
    }
    /**
     * Check if error is related to batch request limits
     */
    isBatchError(error) {
        const errorStr = String(error.message || error).toLowerCase();
        return errorStr.includes('batch of more than') ||
            errorStr.includes('batch request') ||
            errorStr.includes('free tier');
    }
    /**
     * Mark provider as rate limited temporarily
     */
    markProviderRateLimited(providerName) {
        const endpoint = this.endpoints.find(e => e.name === providerName);
        if (endpoint) {
            endpoint.lastRateLimit = Date.now();
            logger.info(`Marked ${providerName} as rate limited temporarily`);
            // Auto-rotate to next provider
            this.rotateProvider('Rate limit detected');
        }
    }
    /**
     * Enhanced provider health check considering rate limits
     */
    getHealthyProvider() {
        const now = Date.now();
        const rateLimitCooldown = 60000; // 1 minute cooldown for rate limits
        // Find provider that is healthy and not rate limited
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
        // If all providers are rate limited, use the one with oldest rate limit
        const leastRecentlyLimited = this.endpoints
            .filter(e => e.isHealthy)
            .sort((a, b) => (a.lastRateLimit || 0) - (b.lastRateLimit || 0))[0];
        if (leastRecentlyLimited) {
            logger.warn(`All providers rate limited, using least recently limited: ${leastRecentlyLimited.name}`);
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
    /**
     * Execute operation with timeout
     */
    executeWithTimeout(operation, timeoutMs) {
        return Promise.race([
            operation,
            new Promise((_, reject) => setTimeout(() => reject(new Error(`Operation timeout after ${timeoutMs}ms`)), timeoutMs))
        ]);
    }
    /**
     * Update provider metrics
     */
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
    /**
     * Simple delay helper
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    getCurrentEndpoint() {
        const healthyEndpoints = this.getHealthyEndpoints();
        if (healthyEndpoints.length === 0) {
            // Reset all endpoints as healthy if none are available
            logger.warn('No healthy endpoints available, resetting all endpoints');
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
        logger.info('Rotating RPC provider', {
            reason,
            from: previousProvider,
            to: newProvider,
            healthyEndpoints: this.getHealthyEndpoints().length
        });
        this.metrics.activeProvider = newProvider;
    }
    updateAverageResponseTime(responseTime) {
        const weight = 0.1; // Exponential moving average
        this.metrics.averageResponseTime =
            this.metrics.averageResponseTime * (1 - weight) + responseTime * weight;
    }
    startHealthMonitoring() {
        // Check endpoint health every 5 minutes
        setInterval(async () => {
            await this.performHealthCheck();
        }, 5 * 60 * 1000);
        // Reset error counts every hour
        setInterval(() => {
            this.endpoints.forEach(endpoint => {
                endpoint.errorCount = Math.max(0, endpoint.errorCount - 1);
                if (endpoint.errorCount === 0 && !endpoint.isHealthy) {
                    endpoint.isHealthy = true;
                    logger.info('Endpoint recovered', { provider: endpoint.name });
                }
            });
        }, 60 * 60 * 1000);
    }
    async performHealthCheck() {
        logger.debug('Performing RPC health check');
        for (const endpoint of this.endpoints) {
            const provider = this.providers.get(endpoint.name);
            if (!provider)
                continue;
            try {
                const startTime = Date.now();
                await provider.getBlockNumber();
                const responseTime = Date.now() - startTime;
                if (responseTime < 10000) { // Less than 10 seconds
                    endpoint.isHealthy = true;
                    endpoint.errorCount = Math.max(0, endpoint.errorCount - 1);
                }
                logger.debug('Health check passed', {
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
                logger.warn('Health check failed', {
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
        // Primary: Use connection pool for best available connection
        const poolConnection = await this.connectionPool.getHealthyConnection();
        if (poolConnection) {
            logger.debug('Using connection pool provider');
            return poolConnection;
        }
        // Fallback: Traditional endpoint selection
        const endpoint = this.getCurrentEndpoint();
        const provider = this.providers.get(endpoint.name);
        if (!provider) {
            throw new Error(`Provider not found for endpoint: ${endpoint.name}`);
        }
        logger.debug('Using traditional provider fallback', { provider: endpoint.name });
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
        logger.info('RPC Manager stopped with all monitoring services');
    }
    /**
     * Enhanced endpoint initialization with network detection
     */
    async initializeEndpointsWithRetry() {
        logger.info('Initializing RPC endpoints with enhanced error handling', {
            component: 'contract'
        });
        const networkName = process.env.NETWORK_NAME || 'sepolia';
        // Enhanced endpoint configuration - removed problematic endpoints
        const endpointConfigs = [
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
                name: 'Tenderly',
                priority: 3,
                maxRequestsPerSecond: 15,
                lastUsed: 0,
                errorCount: 0,
                isHealthy: true
            },
            {
                url: 'https://ethereum-sepolia-rpc.publicnode.com',
                name: 'Ethereum Public',
                priority: 4,
                maxRequestsPerSecond: 10,
                lastUsed: 0,
                errorCount: 0,
                isHealthy: true
            }
        ];
        // Filter out endpoints without valid URLs
        const validConfigs = endpointConfigs.filter(config => config.url &&
            config.url !== '' &&
            !config.url.includes('undefined'));
        // Initialize each endpoint with proper delays and error handling
        for (const config of validConfigs) {
            try {
                // Progressive delay to avoid overwhelming providers
                const initDelay = (config.priority - 1) * 2000; // Increased delay to 2 seconds
                if (initDelay > 0) {
                    await new Promise(resolve => setTimeout(resolve, initDelay));
                }
                logger.info('Initializing RPC endpoint', {
                    component: 'contract',
                    name: config.name,
                    priority: config.priority
                });
                // Create provider with explicit network configuration
                const provider = new ethers.JsonRpcProvider(config.url, {
                    name: 'sepolia',
                    chainId: 11155111
                });
                // Test connectivity with retries but simpler approach
                let connected = false;
                let lastError = null;
                for (let attempt = 1; attempt <= 3; attempt++) {
                    try {
                        // Simple connectivity test with longer timeout
                        const blockNumber = await Promise.race([
                            provider.getBlockNumber(),
                            new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), 12000))
                        ]);
                        if (blockNumber > 0) {
                            connected = true;
                            logger.info('Provider connectivity confirmed', {
                                component: 'contract',
                                provider: config.name,
                                blockNumber
                            });
                            break;
                        }
                    }
                    catch (error) {
                        lastError = error;
                        // Check for specific error types to avoid retries on permanent failures
                        if (error.message && (error.message.includes('Unauthorized') ||
                            error.message.includes('API key') ||
                            error.message.includes('invalid URL'))) {
                            logger.warn(`Provider has permanent issue, skipping`, {
                                component: 'contract',
                                provider: config.name,
                                error: error.message?.substring(0, 100)
                            });
                            break;
                        }
                        logger.warn(`Provider test failed (attempt ${attempt}/3)`, {
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
                    // Add to endpoints and providers
                    this.endpoints.push(config);
                    this.providers.set(config.name, provider);
                    logger.info('RPC endpoint initialized successfully', {
                        component: 'contract',
                        name: config.name,
                        priority: config.priority
                    });
                }
                else {
                    logger.warn('Failed to initialize RPC endpoint after retries', {
                        component: 'contract',
                        name: config.name,
                        error: lastError?.message?.substring(0, 100)
                    });
                }
            }
            catch (error) {
                logger.error('Failed to initialize RPC endpoint', {
                    component: 'contract',
                    name: config.name,
                    error: error.message
                });
            }
        }
        if (this.endpoints.length === 0) {
            logger.error('No valid RPC endpoints configured', { component: 'contract' });
            throw new Error('No valid RPC endpoints available');
        }
        // Sort by priority
        this.endpoints.sort((a, b) => a.priority - b.priority);
        this.metrics.activeProvider = this.endpoints[0]?.name || 'Unknown';
        logger.info('RPC Manager initialization completed', {
            component: 'contract',
            totalEndpoints: this.endpoints.length,
            healthyEndpoints: this.endpoints.filter(e => e.isHealthy).length,
            activeProvider: this.metrics.activeProvider
        });
    }
}
//# sourceMappingURL=RpcManager.js.map