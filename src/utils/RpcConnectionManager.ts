import { ethers } from 'ethers';
import logger from './logger.js';

interface ProviderConfig {
  url: string;
  name: string;
  priority: number;
  maxRetries: number;
  lastUsed: number;
  failureCount: number;
  isHealthy: boolean;
}

export class RpcConnectionManager {
  private providers: ProviderConfig[];
  private currentProvider: ethers.JsonRpcProvider | null = null;
  private currentConfig: ProviderConfig | null = null;
  private readonly RATE_LIMIT_INTERVAL = 5000; // 5 seconds between provider calls
  private readonly HEALTH_CHECK_INTERVAL = 30000; // 30 seconds between health checks
  private readonly MAX_FAILURES_BEFORE_DISABLE = 3;

  constructor() {
    // Validate environment variables first
    const primaryRpcUrl = process.env.ETHEREUM_RPC_URL;
    if (!primaryRpcUrl) {
      logger.error('❌ ETHEREUM_RPC_URL environment variable is not set');
      logger.info('📝 Please set ETHEREUM_RPC_URL in your environment variables');
      logger.info('💡 Example: ETHEREUM_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID');
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

    logger.info(`🔗 Initialized RPC manager with ${this.providers.length} providers`);
  }

  /**
   * Get a working RPC provider with intelligent failover
   */
  async getProvider(): Promise<ethers.JsonRpcProvider> {
    const now = Date.now();

    // Check if current provider is still valid
    if (
      this.currentProvider &&
      this.currentConfig &&
      this.isProviderUsable(this.currentConfig, now)
    ) {
      return this.currentProvider;
    }

    // Find best available provider
    const sortedProviders = this.providers
      .filter((p) => p.isHealthy && this.isProviderUsable(p, now))
      .sort((a, b) => {
        // Sort by priority, then by last used time
        if (a.priority !== b.priority) return a.priority - b.priority;
        return a.lastUsed - b.lastUsed;
      });

    for (const config of sortedProviders) {
      try {
        logger.info(`🔄 Testing provider: ${config.name}`);

        const provider = new ethers.JsonRpcProvider(config.url);

        // Test connection with multiple validation steps
        const connectionTest = async () => {
          // First, test basic connectivity
          const blockNumber = await provider.getBlockNumber();

          // Then validate we're on the correct network (Sepolia = 11155111)
          const network = await provider.getNetwork();
          if (Number(network.chainId) !== 11155111) {
            throw new Error(`Wrong network: expected Sepolia (11155111), got ${network.chainId}`);
          }

          logger.info(
            `✅ Provider ${config.name} validated: block ${blockNumber}, network ${network.name}`
          );
          return blockNumber;
        };

        await Promise.race([
          connectionTest(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Connection timeout after 10s')), 10000)
          )
        ]);

        // Success - update state
        config.lastUsed = now;
        config.failureCount = 0;
        config.isHealthy = true;

        this.currentProvider = provider;
        this.currentConfig = config;

        logger.info(`✅ Connected to ${config.name}`);
        return provider;
      } catch (error: any) {
        logger.warn(`❌ ${config.name} failed: ${error.message.substring(0, 50)}`);
        this.handleProviderFailure(config, error);
      }
    }

    // If all providers failed, try to recover the least recently failed one
    const recoveryProvider = this.providers
      .filter((p) => !p.isHealthy)
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
      } catch (error: any) {
        logger.error(`❌ Recovery failed for ${recoveryProvider.name}`);
      }
    }

    throw new Error('All RPC providers are unavailable');
  }

  /**
   * Check if provider can be used (considering rate limits and health)
   */
  private isProviderUsable(config: ProviderConfig, now: number): boolean {
    if (!config.isHealthy) return false;

    const timeSinceLastUse = now - config.lastUsed;
    return timeSinceLastUse >= this.RATE_LIMIT_INTERVAL;
  }

  /**
   * Handle provider failure and update health status
   */
  private handleProviderFailure(config: ProviderConfig, error: any): void {
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
  async executeContractCall<T>(
    contractCall: (provider: ethers.JsonRpcProvider) => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const provider = await this.getProvider();

        const result = await Promise.race([
          contractCall(provider),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Contract call timeout')), 15000)
          )
        ]);

        return result;
      } catch (error: any) {
        logger.warn(
          `⚠️ Contract call attempt ${attempt}/${maxRetries} failed: ${error.message.substring(
            0,
            50
          )}`
        );

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
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw new Error('All retry attempts failed');
  }

  /**
   * Validate all providers at startup
   */
  async validateAllProviders(): Promise<void> {
    logger.info('🔍 Validating all RPC providers at startup...');

    const validationResults = await Promise.allSettled(
      this.providers.map(async (config) => {
        try {
          const provider = new ethers.JsonRpcProvider(config.url);

          const result = await Promise.race([
            provider.getBlockNumber(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
          ]);

          logger.info(`✅ ${config.name}: Working (block ${result})`);
          return { name: config.name, status: 'working', block: result };
        } catch (error: any) {
          logger.warn(`❌ ${config.name}: Failed - ${error.message.substring(0, 50)}`);
          config.isHealthy = false;
          config.failureCount = 1;
          return { name: config.name, status: 'failed', error: error.message };
        }
      })
    );

    const workingProviders = validationResults.filter(
      (result) => result.status === 'fulfilled' && result.value.status === 'working'
    ).length;

    if (workingProviders === 0) {
      logger.error(
        '❌ No RPC providers are working! Please check your network connection and RPC URLs.'
      );
      throw new Error('All RPC providers failed validation');
    }

    logger.info(
      `✅ Startup validation complete: ${workingProviders}/${this.providers.length} providers working`
    );
  }

  /**
   * Get current provider status for monitoring
   */
  getProviderStatus(): any {
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

export const rpcManager = new RpcConnectionManager();
