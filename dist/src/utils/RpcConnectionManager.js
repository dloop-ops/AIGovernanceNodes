"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rpcManager = exports.RpcConnectionManager = void 0;
const ethers_1 = require("ethers");
const logger_js_1 = __importDefault(require("./logger.js"));
class RpcConnectionManager {
    constructor() {
        this.currentProvider = null;
        this.currentConfig = null;
        this.RATE_LIMIT_INTERVAL = 5000;
        this.HEALTH_CHECK_INTERVAL = 30000;
        this.MAX_FAILURES_BEFORE_DISABLE = 3;
        const primaryRpcUrl = process.env.ETHEREUM_RPC_URL;
        if (!primaryRpcUrl) {
            logger_js_1.default.error('❌ ETHEREUM_RPC_URL environment variable is not set');
            logger_js_1.default.info('📝 Please set ETHEREUM_RPC_URL in your environment variables');
            logger_js_1.default.info('💡 Example: ETHEREUM_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID');
        }
        this.providers = [
            {
                url: primaryRpcUrl || 'https://ethereum-sepolia-rpc.publicnode.com',
                name: primaryRpcUrl ? 'Primary RPC' : 'PublicNode (Fallback)',
                priority: 1,
                maxRetries: 3,
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
            },
            {
                url: 'https://rpc-sepolia.rockx.com',
                name: 'RockX',
                priority: 5,
                maxRetries: 2,
                lastUsed: 0,
                failureCount: 0,
                isHealthy: true
            }
        ];
        logger_js_1.default.info(`🔗 Initialized RPC manager with ${this.providers.length} providers`);
    }
    async getProvider() {
        const now = Date.now();
        if (this.currentProvider &&
            this.currentConfig &&
            this.isProviderUsable(this.currentConfig, now)) {
            return this.currentProvider;
        }
        const sortedProviders = this.providers
            .filter((p) => p.isHealthy && this.isProviderUsable(p, now))
            .sort((a, b) => {
            if (a.priority !== b.priority)
                return a.priority - b.priority;
            return a.lastUsed - b.lastUsed;
        });
        for (const config of sortedProviders) {
            try {
                logger_js_1.default.info(`🔄 Testing provider: ${config.name}`);
                const provider = new ethers_1.ethers.JsonRpcProvider(config.url);
                const connectionTest = async () => {
                    const blockNumber = await provider.getBlockNumber();
                    const network = await provider.getNetwork();
                    if (Number(network.chainId) !== 11155111) {
                        throw new Error(`Wrong network: expected Sepolia (11155111), got ${network.chainId}`);
                    }
                    logger_js_1.default.info(`✅ Provider ${config.name} validated: block ${blockNumber}, network ${network.name}`);
                    return blockNumber;
                };
                await Promise.race([
                    connectionTest(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout after 10s')), 10000))
                ]);
                config.lastUsed = now;
                config.failureCount = 0;
                config.isHealthy = true;
                this.currentProvider = provider;
                this.currentConfig = config;
                logger_js_1.default.info(`✅ Connected to ${config.name}`);
                return provider;
            }
            catch (error) {
                logger_js_1.default.warn(`❌ ${config.name} failed: ${error.message.substring(0, 50)}`);
                this.handleProviderFailure(config, error);
            }
        }
        const recoveryProvider = this.providers
            .filter((p) => !p.isHealthy)
            .sort((a, b) => a.lastUsed - b.lastUsed)[0];
        if (recoveryProvider) {
            logger_js_1.default.info(`🔄 Attempting recovery with ${recoveryProvider.name}`);
            try {
                const provider = new ethers_1.ethers.JsonRpcProvider(recoveryProvider.url);
                await provider.getBlockNumber();
                recoveryProvider.isHealthy = true;
                recoveryProvider.failureCount = 0;
                recoveryProvider.lastUsed = now;
                this.currentProvider = provider;
                this.currentConfig = recoveryProvider;
                return provider;
            }
            catch (error) {
                logger_js_1.default.error(`❌ Recovery failed for ${recoveryProvider.name}`);
            }
        }
        throw new Error('All RPC providers are unavailable');
    }
    isProviderUsable(config, now) {
        if (!config.isHealthy)
            return false;
        const timeSinceLastUse = now - config.lastUsed;
        return timeSinceLastUse >= this.RATE_LIMIT_INTERVAL;
    }
    handleProviderFailure(config, error) {
        config.failureCount++;
        config.lastUsed = Date.now();
        if (error.message.includes('Too Many Requests') || error.code === 'BAD_DATA') {
            logger_js_1.default.warn(`📊 Rate limit detected for ${config.name}`);
            config.lastUsed += this.RATE_LIMIT_INTERVAL * 2;
        }
        if (config.failureCount >= this.MAX_FAILURES_BEFORE_DISABLE) {
            config.isHealthy = false;
            logger_js_1.default.warn(`🚫 Disabled ${config.name} due to repeated failures`);
        }
    }
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
                logger_js_1.default.warn(`⚠️ Contract call attempt ${attempt}/${maxRetries} failed: ${error.message.substring(0, 50)}`);
                if (this.currentConfig) {
                    this.handleProviderFailure(this.currentConfig, error);
                }
                this.currentProvider = null;
                this.currentConfig = null;
                if (attempt === maxRetries) {
                    throw error;
                }
                const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }
        throw new Error('All retry attempts failed');
    }
    async validateAllProviders() {
        logger_js_1.default.info('🔍 Validating all RPC providers at startup...');
        const validationResults = await Promise.allSettled(this.providers.map(async (config) => {
            try {
                const provider = new ethers_1.ethers.JsonRpcProvider(config.url);
                const result = await Promise.race([
                    provider.getBlockNumber(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
                ]);
                logger_js_1.default.info(`✅ ${config.name}: Working (block ${result})`);
                return { name: config.name, status: 'working', block: result };
            }
            catch (error) {
                logger_js_1.default.warn(`❌ ${config.name}: Failed - ${error.message.substring(0, 50)}`);
                config.isHealthy = false;
                config.failureCount = 1;
                return { name: config.name, status: 'failed', error: error.message };
            }
        }));
        const workingProviders = validationResults.filter((result) => result.status === 'fulfilled' && result.value.status === 'working').length;
        if (workingProviders === 0) {
            logger_js_1.default.error('❌ No RPC providers are working! Please check your network connection and RPC URLs.');
            throw new Error('All RPC providers failed validation');
        }
        logger_js_1.default.info(`✅ Startup validation complete: ${workingProviders}/${this.providers.length} providers working`);
    }
    getProviderStatus() {
        return {
            currentProvider: this.currentConfig?.name || 'none',
            providers: this.providers.map((p) => ({
                name: p.name,
                isHealthy: p.isHealthy,
                failureCount: p.failureCount,
                lastUsed: new Date(p.lastUsed).toISOString()
            }))
        };
    }
}
exports.RpcConnectionManager = RpcConnectionManager;
exports.rpcManager = new RpcConnectionManager();
//# sourceMappingURL=RpcConnectionManager.js.map