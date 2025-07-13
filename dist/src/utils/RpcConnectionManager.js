import { ethers } from 'ethers';
import logger from './logger.js';
export class RpcConnectionManager {
    providers;
    currentProvider = null;
    currentConfig = null;
    RATE_LIMIT_INTERVAL = 5000; // 5 seconds between provider calls
    HEALTH_CHECK_INTERVAL = 30000; // 30 seconds between health checks
    MAX_FAILURES_BEFORE_DISABLE = 3;
    constructor() {
        this.providers = [
            {
                url: process.env.ETHEREUM_RPC_URL || 'https://sepolia.infura.io/v3/ca485bd6567e4c5fb5693ee66a5885d8',
                name: 'Infura',
                priority: 1,
                maxRetries: 2,
                lastUsed: 0,
                failureCount: 0,
                isHealthy: true
            },
            {
                url: 'https://ethereum-sepolia-rpc.publicnode.com',
                name: 'PublicNode',
                priority: 2,
                maxRetries: 3,
                lastUsed: 0,
                failureCount: 0,
                isHealthy: true
            },
            {
                url: 'https://rpc.sepolia.org',
                name: 'Sepolia.org',
                priority: 3,
                maxRetries: 3,
                lastUsed: 0,
                failureCount: 0,
                isHealthy: true
            },
            {
                url: 'https://sepolia.gateway.tenderly.co',
                name: 'Tenderly',
                priority: 4,
                maxRetries: 2,
                lastUsed: 0,
                failureCount: 0,
                isHealthy: true
            }
        ];
    }
    /**
     * Get a working RPC provider with intelligent failover
     */
    async getProvider() {
        const now = Date.now();
        // Check if current provider is still valid
        if (this.currentProvider && this.currentConfig && this.isProviderUsable(this.currentConfig, now)) {
            return this.currentProvider;
        }
        // Find best available provider
        const sortedProviders = this.providers
            .filter(p => p.isHealthy && this.isProviderUsable(p, now))
            .sort((a, b) => {
            // Sort by priority, then by last used time
            if (a.priority !== b.priority)
                return a.priority - b.priority;
            return a.lastUsed - b.lastUsed;
        });
        for (const config of sortedProviders) {
            try {
                logger.info(`🔄 Testing provider: ${config.name}`);
                const provider = new ethers.JsonRpcProvider(config.url);
                // Test connection with timeout
                await Promise.race([
                    provider.getBlockNumber(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), 8000))
                ]);
                // Success - update state
                config.lastUsed = now;
                config.failureCount = 0;
                config.isHealthy = true;
                this.currentProvider = provider;
                this.currentConfig = config;
                logger.info(`✅ Connected to ${config.name}`);
                return provider;
            }
            catch (error) {
                logger.warn(`❌ ${config.name} failed: ${error.message.substring(0, 50)}`);
                this.handleProviderFailure(config, error);
            }
        }
        // If all providers failed, try to recover the least recently failed one
        const recoveryProvider = this.providers
            .filter(p => !p.isHealthy)
            .sort((a, b) => a.lastUsed - b.lastUsed)[0];
        if (recoveryProvider) {
            logger.info(`🔄 Attempting recovery with ${recoveryProvider.name}`);
            try {
                const provider = new ethers.JsonRpcProvider(recoveryProvider.url);
                await provider.getBlockNumber();
                recoveryProvider.isHealthy = true;
                recoveryProvider.failureCount = 0;
                recoveryProvider.lastUsed = now;
                this.currentProvider = provider;
                this.currentConfig = recoveryProvider;
                return provider;
            }
            catch (error) {
                logger.error(`❌ Recovery failed for ${recoveryProvider.name}`);
            }
        }
        throw new Error('All RPC providers are unavailable');
    }
    /**
     * Check if provider can be used (considering rate limits and health)
     */
    isProviderUsable(config, now) {
        if (!config.isHealthy)
            return false;
        const timeSinceLastUse = now - config.lastUsed;
        return timeSinceLastUse >= this.RATE_LIMIT_INTERVAL;
    }
    /**
     * Handle provider failure and update health status
     */
    handleProviderFailure(config, error) {
        config.failureCount++;
        config.lastUsed = Date.now();
        // Check for rate limiting
        if (error.message.includes('Too Many Requests') || error.code === 'BAD_DATA') {
            logger.warn(`📊 Rate limit detected for ${config.name}`);
            // Temporary disable for longer period
            config.lastUsed += this.RATE_LIMIT_INTERVAL * 2;
        }
        // Disable provider if too many failures
        if (config.failureCount >= this.MAX_FAILURES_BEFORE_DISABLE) {
            config.isHealthy = false;
            logger.warn(`🚫 Disabled ${config.name} due to repeated failures`);
        }
    }
    /**
     * Execute contract call with automatic retry and provider switching
     */
    async executeContractCall(contractCall, maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const provider = await this.getProvider();
                const result = await Promise.race([
                    contractCall(provider),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Contract call timeout')), 15000))
                ]);
                return result;
            }
            catch (error) {
                logger.warn(`⚠️ Contract call attempt ${attempt}/${maxRetries} failed: ${error.message.substring(0, 50)}`);
                // Handle specific error types
                if (this.currentConfig) {
                    this.handleProviderFailure(this.currentConfig, error);
                }
                // Reset current provider to force new selection
                this.currentProvider = null;
                this.currentConfig = null;
                if (attempt === maxRetries) {
                    throw error;
                }
                // Exponential backoff
                const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        throw new Error('All retry attempts failed');
    }
    /**
     * Get current provider status for monitoring
     */
    getProviderStatus() {
        return {
            currentProvider: this.currentConfig?.name || 'none',
            providers: this.providers.map(p => ({
                name: p.name,
                isHealthy: p.isHealthy,
                failureCount: p.failureCount,
                lastUsed: new Date(p.lastUsed).toISOString()
            }))
        };
    }
}
export const rpcManager = new RpcConnectionManager();
//# sourceMappingURL=RpcConnectionManager.js.map