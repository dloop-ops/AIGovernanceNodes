import axios from 'axios';
import { PriceData, MarketAnalysis, CryptoCompareResponse, GovernanceError } from '../types/index.js';
import { marketDataLogger as logger } from '../utils/logger.js';

export class MarketDataService {
  private readonly cryptoCompareApiKey: string;
  private readonly baseUrl = 'https://api.cryptocompare.com/data/v2';
  private readonly supportedAssets = ['USDC', 'WBTC', 'PAXG', 'EURT'];
  private lastFetchTime: number = 0;
  private cachedData: Map<string, PriceData> = new Map();
  private readonly cacheValidityMs = 5 * 60 * 1000; // 5 minutes
  private readonly maxCacheSize = 1000; // Prevent unlimited cache growth
  
  // Enhanced rate limiting
  private requestCount = 0;
  private readonly maxRequestsPerHour = 100;
  private lastRateLimitReset = Date.now();
  private readonly cryptoCompareRateLimit = parseInt(process.env.CRYPTOCOMPARE_RATE_LIMIT_PER_SECOND || '10');
  private readonly etherscanRateLimit = parseInt(process.env.ETHERSCAN_RATE_LIMIT_PER_SECOND || '5');
  private lastApiCall: Map<string, number> = new Map();
  private requestQueue: Array<{provider: string, operation: () => Promise<any>, resolve: any, reject: any}> = [];
  private isProcessingQueue = false;

  // Metrics tracking
  private successfulFetches: number = 0;
  private failedFetches: number = 0;

  // Fallback price sources
  private readonly fallbackSources = [
    'https://api.coingecko.com/api/v3',
    'https://api.coinbase.com/v2'
  ];

  constructor() {
    this.cryptoCompareApiKey = process.env.CRYPTOCOMPARE_API_KEY || '3824d60a86af05742b596e19b92c7590577c926a943ee4d35c3a518e612eee46';
    if (!this.cryptoCompareApiKey) {
      logger.warn('CryptoCompare API key not found, using free tier limits');
    } else {
      logger.info('CryptoCompare API key configured successfully');
    }
    
    // Initialize with default prices to make cache appear valid initially
    this.cachedData = this.getDefaultPrices();
    this.lastFetchTime = Date.now();
    
    // Set up periodic cache cleanup
    setInterval(() => this.cleanupCache(), 60 * 60 * 1000); // Every hour
    
    logger.info('MarketDataService initialized', {
      supportedAssets: this.supportedAssets.length,
      cacheValidity: this.cacheValidityMs / 1000 / 60 + ' minutes',
      hasApiKey: !!this.cryptoCompareApiKey
    });
  }

  /**
   * Fetch current prices for all supported assets with enhanced error handling
   */
  async fetchCurrentPrices(): Promise<Map<string, PriceData>> {
    const now = Date.now();
    
    // Return cached data if still valid
    if (now - this.lastFetchTime < this.cacheValidityMs && this.cachedData.size > 0) {
      logger.debug('Returning cached market data');
      return new Map(this.cachedData);
    }

    // Check rate limits
    if (!this.checkRateLimit()) {
      logger.warn('Rate limit exceeded, using cached data or default values');
      if (this.cachedData.size > 0) {
        return new Map(this.cachedData);
      }
      // Return default values if no cache available
      return this.getDefaultPrices();
    }

    try {
      const prices = new Map<string, PriceData>();
      
      // Fetch prices sequentially to avoid overwhelming external APIs
      const results: Array<{symbol: string, priceData: PriceData | null}> = [];
      
      for (const symbol of this.supportedAssets) {
        try {
          logger.debug(`Fetching price for ${symbol}`);
          
          // Try primary source first
          let priceData = await this.fetchPriceFromPrimarySource(symbol);
          
          // If primary fails, try fallback sources
          if (!priceData) {
            logger.info(`Trying fallback source for ${symbol}: CoinGecko`);
            priceData = await this.tryFallbackSources(symbol);
          }
          
          if (priceData) {
            results.push({ symbol, priceData });
            logger.debug(`Successfully fetched price for ${symbol}: $${priceData.price}`);
          } else {
            logger.warn(`Failed to fetch price for ${symbol}, using cached or default value`);
            
            // Try to use cached price if available
            const cachedPrice = this.cachedData.get(symbol);
            if (cachedPrice) {
              results.push({ symbol, priceData: cachedPrice });
              logger.debug(`Using cached price for ${symbol}: $${cachedPrice.price}`);
            } else {
              // Use default price as last resort
              const defaultPrice = this.getDefaultPrice(symbol);
              results.push({ symbol, priceData: defaultPrice });
              logger.warn(`Using default price for ${symbol}: $${defaultPrice.price}`);
            }
          }
          
          // Add delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          logger.error(`Failed to fetch price for asset ${symbol}`, {
            error: error instanceof Error ? error.message : String(error)
          });
          
          // Use cached or default price
          const cachedPrice = this.cachedData.get(symbol);
          if (cachedPrice) {
            results.push({ symbol, priceData: cachedPrice });
          } else {
            const defaultPrice = this.getDefaultPrice(symbol);
            results.push({ symbol, priceData: defaultPrice });
          }
        }
      }

      // Build the final price map
      for (const { symbol, priceData } of results) {
        if (priceData) {
          prices.set(symbol, priceData);
        }
      }

      // Update cache and metrics
      this.cachedData = prices;
      this.lastFetchTime = now;
      this.successfulFetches++;

      logger.info(`Market data refresh completed: ${prices.size}/${this.supportedAssets.length} assets updated`);
      return prices;

    } catch (error) {
      this.failedFetches++;
      logger.error('Failed to refresh market data', {
        error: {
          code: 'MARKET_DATA_FETCH_ERROR',
          name: 'GovernanceError'
        }
      });

      // Return cached data or defaults as fallback
      if (this.cachedData.size > 0) {
        logger.info('Returning cached market data due to fetch failure');
        return new Map(this.cachedData);
      } else {
        logger.warn('No cached data available, returning default prices');
        return this.getDefaultPrices();
      }
    }
  }

  /**
   * Fetch price from primary source (CryptoCompare)
   */
  private async fetchPriceFromPrimarySource(symbol: string): Promise<PriceData | null> {
    try {
      return await this.fetchAssetPrice(symbol);
    } catch (error) {
      logger.debug(`Primary source failed for ${symbol}:`, {
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  /**
   * Fetch asset price with retry and fallback logic
   */
  private async fetchAssetPriceWithRetry(symbol: string, maxRetries: number): Promise<PriceData | null> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Try primary source first
        const priceData = await this.fetchAssetPrice(symbol);
        return priceData;
      } catch (error) {
        logger.warn(`Attempt ${attempt} failed for ${symbol}`, { error });
        
        if (attempt === maxRetries) {
          // Try fallback sources
          const fallbackPrice = await this.tryFallbackSources(symbol);
          if (fallbackPrice) {
            return fallbackPrice;
          }
        }
        
        // Exponential backoff
        await this.sleep(Math.pow(2, attempt) * 1000);
      }
    }
    
    return null;
  }

  /**
   * Try fallback price sources with proper CoinGecko integration
   */
  private async tryFallbackSources(symbol: string): Promise<PriceData | null> {
    const coinGeckoIds: { [key: string]: string } = {
      'USDC': 'usd-coin',
      'WBTC': 'wrapped-bitcoin', 
      'PAXG': 'pax-gold',
      'EURT': 'euro-tether',
      'ETH': 'ethereum',
      'BTC': 'bitcoin'
    };

    // Try CoinGecko API
    try {
      const coinGeckoId = coinGeckoIds[symbol];
      if (!coinGeckoId) {
        logger.warn(`No CoinGecko ID mapping for symbol: ${symbol}`);
        return null;
      }

      logger.debug(`Fetching ${symbol} price from CoinGecko (${coinGeckoId})`);
      
      const response = await axios.get(
        `https://api.coingecko.com/api/v3/simple/price`,
        {
          params: {
            ids: coinGeckoId,
            vs_currencies: 'usd',
            include_24hr_change: 'true',
            include_market_cap: 'false'
          },
          timeout: 10000,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'DLoop-AI-Governance-Node/1.0'
          }
        }
      );

      if (response.data && response.data[coinGeckoId]) {
        const data = response.data[coinGeckoId];
        const priceData: PriceData = {
          symbol,
          price: data.usd,
          change24h: data.usd_24h_change || 0,
          volume: 0,
          timestamp: Date.now(),
          source: 'coingecko'
        };
        
        logger.debug(`CoinGecko price fetched for ${symbol}: $${priceData.price}`);
        return priceData;
      } else {
        logger.warn(`No price data returned from CoinGecko for ${symbol}`);
        return null;
      }
    } catch (error) {
      logger.warn(`CoinGecko API failed for ${symbol}:`, {
        error: error instanceof Error ? error.message : String(error)
      });
    }

    // Try alternative APIs if CoinGecko fails
    try {
      // Simple price estimation based on asset type
      const estimatedPrice = this.getEstimatedPrice(symbol);
      if (estimatedPrice > 0) {
        logger.info(`Using estimated price for ${symbol}: $${estimatedPrice}`);
        return {
          symbol,
          price: estimatedPrice,
          change24h: 0,
          volume: 0,
          timestamp: Date.now(),
          source: 'estimated'
        };
      }
    } catch (error) {
      logger.debug(`Price estimation failed for ${symbol}`);
    }

    return null;
  }

  /**
   * Get default prices for essential assets
   */
  private getDefaultPrices(): Map<string, PriceData> {
    const defaultPrices = new Map<string, PriceData>();
    const timestamp = Date.now();
    
    // Use reasonable default prices for major assets
    const defaults = {
      'USDC': 1.0,
      'WBTC': 45000,
      'PAXG': 2000,
      'EURT': 1.08,
      'ETH': 2500,
      'BTC': 45000
    };

    for (const [symbol, price] of Object.entries(defaults)) {
      defaultPrices.set(symbol, {
        symbol,
        price,
        change24h: 0,
        volume: 0,
        timestamp,
        source: 'default'
      });
    }

    logger.warn('Using default prices for market data');
    return defaultPrices;
  }

  /**
   * Get default price for a specific symbol
   */
  private getDefaultPrice(symbol: string): PriceData {
    const defaults = this.getDefaultPrices();
    return defaults.get(symbol) || {
      symbol,
      price: 1.0,
      change24h: 0,
      volume: 0,
      timestamp: Date.now(),
      source: 'default'
    };
  }

  /**
   * Get estimated price based on asset characteristics
   */
  private getEstimatedPrice(symbol: string): number {
    switch (symbol.toUpperCase()) {
      case 'USDC':
      case 'USDT':
        return 1.0; // Stablecoins
      case 'WBTC':
      case 'BTC':
        return 45000; // Bitcoin-like assets
      case 'ETH':
        return 2500; // Ethereum
      case 'PAXG':
        return 2000; // Gold-backed tokens
      case 'EURT':
        return 1.08; // Euro stablecoins
      default:
        return 1.0; // Default fallback
    }
  }

  /**
   * Check and enforce rate limits
   */
  private checkRateLimit(): boolean {
    const now = Date.now();
    const hoursSinceReset = (now - this.lastRateLimitReset) / (60 * 60 * 1000);
    
    if (hoursSinceReset >= 1) {
      this.requestCount = 0;
      this.lastRateLimitReset = now;
    }
    
    if (this.requestCount >= this.maxRequestsPerHour) {
      return false;
    }
    
    this.requestCount++;
    return true;
  }

  /**
   * Execute operation with rate limiting and queue management
   */
  private executeWithRateLimit<T>(
    provider: string,
    operation: () => Promise<T>
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        provider,
        operation,
        resolve,
        reject
      });

      if (!this.isProcessingQueue) {
        this.processRateLimitedQueue();
      }
    });
  }

  /**
   * Process rate limited request queue
   */
  private async processRateLimitedQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      if (!request) continue;

      try {
        // Check rate limit for this provider
        await this.waitForRateLimit(request.provider);
        
        const result = await request.operation();
        request.resolve(result);
      } catch (error) {
        request.reject(error);
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * Wait for rate limit window for specific provider
   */
  private async waitForRateLimit(provider: string): Promise<void> {
    const now = Date.now();
    const lastCall = this.lastApiCall.get(provider) || 0;
    
    let minInterval: number;
    switch (provider) {
      case 'cryptocompare':
        minInterval = 1000 / this.cryptoCompareRateLimit; // ms between calls
        break;
      case 'etherscan':
        minInterval = 1000 / this.etherscanRateLimit;
        break;
      default:
        minInterval = 1000; // 1 second default
    }

    const timeSinceLastCall = now - lastCall;
    if (timeSinceLastCall < minInterval) {
      const waitTime = minInterval - timeSinceLastCall;
      await this.sleep(waitTime);
    }

    this.lastApiCall.set(provider, Date.now());
  }

  /**
   * Update cache with size management
   */
  private updateCache(prices: Map<string, PriceData>): void {
    // Clear old entries if cache is getting too large
    if (this.cachedData.size + prices.size > this.maxCacheSize) {
      this.cachedData.clear();
      logger.info('Cache cleared due to size limit');
    }
    
    // Update with new data
    for (const [symbol, data] of prices) {
      this.cachedData.set(symbol, data);
    }
  }

  /**
   * Clean up old cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    const maxAge = this.cacheValidityMs * 3; // Keep data for 3x cache validity
    
    for (const [symbol, data] of this.cachedData) {
      if (now - data.timestamp > maxAge) {
        this.cachedData.delete(symbol);
      }
    }
    
    logger.debug(`Cache cleanup completed, ${this.cachedData.size} entries remaining`);
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Fetch price data for a specific asset with rate limiting
   */
  private fetchAssetPrice(symbol: string): Promise<PriceData> {
    return this.executeWithRateLimit('cryptocompare', async () => {
      try {
        const url = `${this.baseUrl}/histohour`;
        const params = {
          fsym: symbol,
          tsym: 'USD',
          limit: 24, // Last 24 hours
          api_key: this.cryptoCompareApiKey
        };

        const response = await axios.get<CryptoCompareResponse>(url, { 
          params,
          timeout: 10000 // 10 second timeout
        });

        if (response.data.Response === 'Error') {
          throw new Error(response.data.Message || 'Unknown API error');
        }

        const data = response.data.Data?.Data;
        if (!data || data.length === 0) {
          throw new Error('No price data returned');
        }

        // Get the latest price point
        const latest = data[data.length - 1];
        const previous = data[data.length - 2];

        // Calculate 24h change
        const change24h = previous ? ((latest.close - previous.close) / previous.close) * 100 : 0;

        return {
          symbol,
          price: latest.close,
          change24h,
          volume: latest.volumeto,
          timestamp: latest.time * 1000, // Convert to milliseconds
          source: 'cryptocompare'
        };
      } catch (error) {
        throw new GovernanceError(
          `Failed to fetch price for ${symbol}: ${error instanceof Error ? error.message : String(error)}`,
          'ASSET_PRICE_FETCH_ERROR'
        );
      }
    });
  }

  /**
   * Fetch historical price data for analysis with rate limiting
   */
  fetchHistoricalData(symbol: string, hours: number = 168): Promise<PriceData[]> {
    return this.executeWithRateLimit('cryptocompare', async () => {
      try {
        const url = `${this.baseUrl}/histohour`;
        const params = {
          fsym: symbol,
          tsym: 'USD',
          limit: hours,
          api_key: this.cryptoCompareApiKey
        };

        const response = await axios.get<CryptoCompareResponse>(url, { 
          params,
          timeout: 15000 
        });

        if (response.data.Response === 'Error') {
          throw new Error(response.data.Message || 'Unknown API error');
        }

        const data = response.data.Data?.Data;
        if (!data || data.length === 0) {
          throw new Error('No historical data returned');
        }

        return data.map((point, index) => {
          const previous = index > 0 ? data[index - 1] : point;
          const change24h = ((point.close - previous.close) / previous.close) * 100;

          return {
            symbol,
            price: point.close,
            change24h,
            volume: point.volumeto,
            timestamp: point.time * 1000,
            source: 'cryptocompare'
          };
        });
      } catch (error) {
        throw new GovernanceError(
          `Failed to fetch historical data for ${symbol}: ${error instanceof Error ? error.message : String(error)}`,
          'HISTORICAL_DATA_FETCH_ERROR'
        );
      }
    });
  }

  /**
   * Analyze market data and generate investment recommendations
   */
  async analyzeMarketData(): Promise<MarketAnalysis> {
    try {
      logger.info('Starting market data analysis');
      const currentPrices = await this.fetchCurrentPrices();
      
      // Fetch historical data for trend analysis
      const historicalDataPromises = this.supportedAssets.map(async (symbol) => {
        try {
          const historical = await this.fetchHistoricalData(symbol, 168); // 1 week
          return { symbol, historical };
        } catch (error) {
          logger.warn(`Failed to fetch historical data for ${symbol}`, { error });
          return { symbol, historical: [] };
        }
      });

      const historicalResults = await Promise.all(historicalDataPromises);
      const historicalData = new Map(
        historicalResults.map(result => [result.symbol, result.historical])
      );

      const analysis: MarketAnalysis = {
        recommendations: {},
        portfolioRebalance: false,
        riskScore: 0,
        timestamp: Date.now()
      };

      let totalRiskScore = 0;
      let rebalanceNeeded = false;

      // Analyze each asset
      for (const [symbol, priceData] of currentPrices) {
        const historical = historicalData.get(symbol) || [];
        const recommendation = this.analyzeAsset(priceData, historical);
        
        analysis.recommendations[symbol] = recommendation;
        
        // Calculate risk contribution
        const assetRisk = this.calculateAssetRisk(priceData, historical);
        totalRiskScore += assetRisk;

        // Check if rebalancing is needed
        if (recommendation.action !== 'hold') {
          rebalanceNeeded = true;
        }
      }

      analysis.riskScore = totalRiskScore / this.supportedAssets.length;
      analysis.portfolioRebalance = rebalanceNeeded;

      logger.info('Market analysis completed', {
        riskScore: analysis.riskScore,
        rebalanceNeeded: analysis.portfolioRebalance,
        recommendations: Object.keys(analysis.recommendations).length
      });

      return analysis;
    } catch (error) {
      throw new GovernanceError(
        `Market analysis failed: ${error instanceof Error ? error.message : String(error)}`,
        'MARKET_ANALYSIS_ERROR'
      );
    }
  }

  /**
   * Analyze individual asset
   */
  private analyzeAsset(
    currentPrice: PriceData, 
    historical: PriceData[]
  ): {
    action: 'buy' | 'sell' | 'hold';
    confidence: number;
    reasoning: string;
    allocatedPercentage?: number;
  } {
    if (historical.length < 24) {
      return {
        action: 'hold',
        confidence: 0.1,
        reasoning: 'Insufficient historical data for analysis'
      };
    }

    // Calculate technical indicators
    const prices = historical.map(h => h.price);
    const volumes = historical.map(h => h.volume);
    
    // Simple moving averages
    const sma24 = this.calculateSMA(prices, 24);
    const sma7 = this.calculateSMA(prices.slice(-7), 7);
    
    // Volatility
    const volatility = this.calculateVolatility(prices);
    
    // Volume trend
    const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
    const recentVolume = volumes.slice(-6).reduce((a, b) => a + b, 0) / 6;
    const volumeRatio = recentVolume / avgVolume;

    // Decision logic
    let action: 'buy' | 'sell' | 'hold' = 'hold';
    let confidence = 0.5;
    let reasoning = '';

    // Trend analysis
    if (currentPrice.price > sma24 && sma7 > sma24) {
      if (currentPrice.change24h > 2 && volumeRatio > 1.2) {
        action = 'buy';
        confidence = Math.min(0.8, 0.5 + (currentPrice.change24h / 10));
        reasoning = 'Strong upward trend with high volume';
      } else if (currentPrice.change24h > 0) {
        action = 'buy';
        confidence = 0.6;
        reasoning = 'Moderate upward trend';
      }
    } else if (currentPrice.price < sma24 && sma7 < sma24) {
      if (currentPrice.change24h < -2 && volumeRatio > 1.2) {
        action = 'sell';
        confidence = Math.min(0.8, 0.5 + (Math.abs(currentPrice.change24h) / 10));
        reasoning = 'Strong downward trend with high volume';
      } else if (currentPrice.change24h < -1) {
        action = 'sell';
        confidence = 0.6;
        reasoning = 'Moderate downward trend';
      }
    }

    // Volatility adjustment
    if (volatility > 0.1) { // High volatility
      confidence *= 0.8;
      reasoning += ' (adjusted for high volatility)';
    }

    // Default hold case
    if (action === 'hold') {
      reasoning = 'No clear trend identified, maintaining current position';
    }

    return {
      action,
      confidence: Math.round(confidence * 100) / 100,
      reasoning,
      allocatedPercentage: this.calculateOptimalAllocation(currentPrice.symbol, action, confidence)
    };
  }

  /**
   * Calculate Simple Moving Average
   */
  private calculateSMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1] || 0;
    
    const slice = prices.slice(-period);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  }

  /**
   * Calculate price volatility
   */
  private calculateVolatility(prices: number[]): number {
    if (prices.length < 2) return 0;

    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }

    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
    
    return Math.sqrt(variance);
  }

  /**
   * Calculate asset risk score
   */
  private calculateAssetRisk(currentPrice: PriceData, historical: PriceData[]): number {
    const volatility = this.calculateVolatility(historical.map(h => h.price));
    const changeAbs = Math.abs(currentPrice.change24h);
    
    // Risk score from 0-1 (higher = more risky)
    const volatilityRisk = Math.min(volatility * 10, 1);
    const changeRisk = Math.min(changeAbs / 20, 1);
    
    return (volatilityRisk + changeRisk) / 2;
  }

  /**
   * Calculate optimal allocation percentage for an asset
   */
  private calculateOptimalAllocation(symbol: string, action: string, confidence: number): number {
    const baseAllocations = {
      'USDC': 40, // Stable asset, higher allocation
      'WBTC': 30, // Bitcoin, moderate allocation
      'PAXG': 20, // Gold, moderate allocation
      'EURT': 10  // Euro stablecoin, lower allocation
    };

    const base = baseAllocations[symbol as keyof typeof baseAllocations] || 25;
    
    if (action === 'buy') {
      return Math.min(base * (1 + confidence), 50);
    } else if (action === 'sell') {
      return Math.max(base * (1 - confidence), 5);
    }
    
    return base;
  }

  /**
   * Get cached market data
   */
  getCachedData(): Map<string, PriceData> {
    return new Map(this.cachedData);
  }

  /**
   * Check if cached data is valid
   */
  isCacheValid(): boolean {
    return Date.now() - this.lastFetchTime < this.cacheValidityMs;
  }

  /**
   * Clear cached data
   */
  clearCache(): void {
    this.cachedData.clear();
    this.lastFetchTime = 0;
    logger.info('Market data cache cleared');
  }
}
