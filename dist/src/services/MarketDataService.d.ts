import { PriceData, MarketAnalysis } from '../types/index.js';
export declare class MarketDataService {
    private readonly cryptoCompareApiKey;
    private readonly baseUrl;
    private readonly supportedAssets;
    private lastFetchTime;
    private cachedData;
    private readonly cacheValidityMs;
    private readonly maxCacheSize;
    private requestCount;
    private readonly maxRequestsPerHour;
    private lastRateLimitReset;
    private readonly cryptoCompareRateLimit;
    private readonly etherscanRateLimit;
    private lastApiCall;
    private requestQueue;
    private isProcessingQueue;
    private successfulFetches;
    private failedFetches;
    private readonly fallbackSources;
    constructor();
    /**
     * Fetch current prices for all supported assets with enhanced error handling
     */
    fetchCurrentPrices(): Promise<Map<string, PriceData>>;
    /**
     * Fetch price from primary source (CryptoCompare)
     */
    private fetchPriceFromPrimarySource;
    /**
     * Fetch asset price with retry and fallback logic
     */
    private fetchAssetPriceWithRetry;
    /**
     * Try fallback price sources with proper CoinGecko integration
     */
    private tryFallbackSources;
    /**
     * Get default prices for essential assets
     */
    private getDefaultPrices;
    /**
     * Get default price for a specific symbol
     */
    private getDefaultPrice;
    /**
     * Get estimated price based on asset characteristics
     */
    private getEstimatedPrice;
    /**
     * Check and enforce rate limits
     */
    private checkRateLimit;
    /**
     * Execute operation with rate limiting and queue management
     */
    private executeWithRateLimit;
    /**
     * Process rate limited request queue
     */
    private processRateLimitedQueue;
    /**
     * Wait for rate limit window for specific provider
     */
    private waitForRateLimit;
    /**
     * Update cache with size management
     */
    private updateCache;
    /**
     * Clean up old cache entries
     */
    private cleanupCache;
    /**
     * Sleep utility for retry delays
     */
    private sleep;
    /**
     * Fetch price data for a specific asset with rate limiting
     */
    private fetchAssetPrice;
    /**
     * Fetch historical price data for analysis with rate limiting
     */
    fetchHistoricalData(symbol: string, hours?: number): Promise<PriceData[]>;
    /**
     * Analyze market data and generate investment recommendations
     */
    analyzeMarketData(): Promise<MarketAnalysis>;
    /**
     * Analyze individual asset
     */
    private analyzeAsset;
    /**
     * Calculate Simple Moving Average
     */
    private calculateSMA;
    /**
     * Calculate price volatility
     */
    private calculateVolatility;
    /**
     * Calculate asset risk score
     */
    private calculateAssetRisk;
    /**
     * Calculate optimal allocation percentage for an asset
     */
    private calculateOptimalAllocation;
    /**
     * Get cached market data
     */
    getCachedData(): Map<string, PriceData>;
    /**
     * Check if cached data is valid
     */
    isCacheValid(): boolean;
    /**
     * Clear cached data
     */
    clearCache(): void;
}
//# sourceMappingURL=MarketDataService.d.ts.map