import { ethers } from 'ethers';
import { walletLogger as logger } from '../utils/logger.js';

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

export class NetworkMonitor {
  private providers: Map<string, ethers.JsonRpcProvider> = new Map();
  private networkStatus: Map<string, NetworkStatus> = new Map();
  private metrics: Map<string, NetworkMetrics> = new Map();
  private isMonitoring: boolean = false;
  private monitoringInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.initializeProviders();
    this.startMonitoring();
  }

  private initializeProviders(): void {
    const providerConfigs: ProviderConfig[] = [
      {
        name: 'Primary Infura',
        url:
          process.env.INFURA_SEPOLIA_URL ||
          'https://sepolia.infura.io/v3/ca485bd6567e4c5fb5693ee66a5885d8',
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
      // Removed Ankr Public endpoint due to API key requirements
    ];

    providerConfigs.forEach((endpoint, index) => {
      if (endpoint.url && !endpoint.url.includes('undefined')) {
        try {
          // Initialize provider for monitoring
          setTimeout(() => {
            try {
              const provider = new ethers.JsonRpcProvider(endpoint.url);
              this.providers.set(endpoint.name, provider);

              // Initialize metrics
              this.metrics.set(endpoint.name, {
                successRate: 0,
                averageLatency: 0,
                totalChecks: 0,
                failedChecks: 0,
                lastSuccessfulCheck: 0
              });

              logger.debug('Provider initialized for monitoring', {
                component: 'contract',
                provider: endpoint.name,
                url: endpoint.url.substring(0, 50) + '...'
              });
            } catch (error) {
              logger.warn('Failed to initialize provider for monitoring', {
                component: 'contract',
                provider: endpoint.name,
                error: error instanceof Error ? error.message : 'Unknown error'
              });
            }
          }, index * 300); // 300ms delay between each provider initialization
        } catch (error) {
          logger.warn('Failed to schedule provider initialization for monitoring', {
            component: 'contract',
            provider: endpoint.name,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    });
  }

  private startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    logger.info('Starting network monitoring');

    // Check every 30 seconds
    this.monitoringInterval = setInterval(() => {
      this.performHealthChecks();
    }, 30000);

    // Initial check
    this.performHealthChecks();
  }

  private async performHealthChecks(): Promise<void> {
    // Use sequential checks to avoid batch request limits on free tier RPC providers
    const providers = Array.from(this.providers.entries());

    for (const [name, provider] of providers) {
      try {
        await this.checkProviderHealth(name, provider);
        // Add small delay between checks to respect rate limits
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        logger.debug('Health check failed for provider', { provider: name, error });
      }
    }

    this.logNetworkStatus();
  }

  private async checkProviderHealth(name: string, provider: ethers.JsonRpcProvider): Promise<void> {
    const startTime = Date.now();
    const metrics = this.metrics.get(name)!;

    try {
      metrics.totalChecks++;

      // Perform multiple checks
      const [blockNumber, chainId] = await Promise.all([
        provider.getBlockNumber(),
        provider.getNetwork().then((network) => Number(network.chainId))
      ]);

      const latency = Date.now() - startTime;
      const now = Date.now();

      // Update status
      this.networkStatus.set(name, {
        isConnected: true,
        latency,
        blockNumber,
        chainId,
        provider: name,
        lastCheck: now
      });

      // Update metrics
      metrics.lastSuccessfulCheck = now;
      metrics.averageLatency = (metrics.averageLatency + latency) / 2;
      metrics.successRate =
        ((metrics.totalChecks - metrics.failedChecks) / metrics.totalChecks) * 100;

      logger.debug('Provider health check passed', {
        provider: name,
        latency,
        blockNumber,
        chainId
      });
    } catch (error) {
      metrics.failedChecks++;
      metrics.successRate =
        ((metrics.totalChecks - metrics.failedChecks) / metrics.totalChecks) * 100;

      this.networkStatus.set(name, {
        isConnected: false,
        latency: -1,
        blockNumber: -1,
        chainId: -1,
        provider: name,
        lastCheck: Date.now()
      });

      logger.warn('Provider health check failed', {
        provider: name,
        error: error instanceof Error ? error.message : 'Unknown error',
        failureRate: (metrics.failedChecks / metrics.totalChecks) * 100
      });
    }
  }

  private logNetworkStatus(): void {
    const statuses = Array.from(this.networkStatus.values());
    const connected = statuses.filter((s) => s.isConnected);
    const disconnected = statuses.filter((s) => !s.isConnected);

    if (connected.length === 0) {
      logger.error('All RPC providers are disconnected', {
        totalProviders: statuses.length,
        connectedProviders: 0
      });
    } else if (disconnected.length > 0) {
      logger.warn('Some RPC providers are experiencing issues', {
        totalProviders: statuses.length,
        connectedProviders: connected.length,
        disconnectedProviders: disconnected.length,
        healthyProviders: connected.map((s) => s.provider)
      });
    }

    // Log metrics every 5 minutes
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    if (!this.lastMetricsLog || now - this.lastMetricsLog > fiveMinutes) {
      this.logDetailedMetrics();
      this.lastMetricsLog = now;
    }
  }

  private lastMetricsLog: number = 0;

  private logDetailedMetrics(): void {
    const metricsReport = Array.from(this.metrics.entries()).map(([name, metrics]) => ({
      provider: name,
      successRate: Math.round(metrics.successRate * 100) / 100,
      averageLatency: Math.round(metrics.averageLatency),
      totalChecks: metrics.totalChecks,
      timeSinceLastSuccess: metrics.lastSuccessfulCheck
        ? Math.round((Date.now() - metrics.lastSuccessfulCheck) / 1000)
        : -1
    }));

    logger.info('Network monitoring metrics', {
      providers: metricsReport,
      monitoringActive: this.isMonitoring
    });
  }

  public getNetworkStatus(): Map<string, NetworkStatus> {
    return new Map(this.networkStatus);
  }

  public getHealthyProviders(): string[] {
    return Array.from(this.networkStatus.entries())
      .filter(([_name, status]) => status.isConnected)
      .map(([name, _status]) => name);
  }

  public getBestProvider(): string | null {
    const healthyProviders = Array.from(this.networkStatus.entries())
      .filter(([_name, status]) => status.isConnected)
      .sort(([_name1, a], [_name2, b]) => a.latency - b.latency);

    return healthyProviders.length > 0 ? healthyProviders[0][0] : null;
  }

  public getMetrics(): Map<string, NetworkMetrics> {
    return new Map(this.metrics);
  }

  public isNetworkHealthy(): boolean {
    const healthyCount = this.getHealthyProviders().length;
    const totalCount = this.providers.size;
    return healthyCount > 0 && healthyCount / totalCount >= 0.25; // At least 25% healthy
  }

  public stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    logger.info('Network monitoring stopped');
  }
}
