import { GovernanceError } from '../types/index';
import logger from '../utils/logger';

export interface MarketAnalysis {
  recommendation: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  reasoning: string;
}

export interface MarketData {
  symbol: string;
  price: number;
  change24h: number;
  volume: number;
  timestamp: number;
}

export class MarketDataService {
  private cache: Map<string, MarketData> = new Map();
  private cacheExpiry: number = 5 * 60 * 1000; // 5 minutes
  private lastUpdate: number = 0;

  constructor() {
    logger.info('MarketDataService initialized');
  }

  /**
   * Analyze market data for governance decisions
   */
  async analyzeMarketData(): Promise<any> {
    try {
      const prices = await this.fetchCurrentPrices();
      const analysis = {
        marketTrend: 'neutral',
        volatility: 'low',
        recommendation: 'moderate',
        prices: Object.fromEntries(prices)
      };

      logger.info('Market analysis completed:', analysis);
      return analysis;
    } catch (error) {
      logger.error('Failed to analyze market data:', error);
      throw error;
    }
  }

  /**
   * Get current price for a specific symbol
   */
  async getCurrentPrice(symbol: string): Promise<number> {
    try {
      const prices = await this.fetchCurrentPrices();
      const marketData = prices.get(symbol.toUpperCase());
      return marketData?.price || 0;
    } catch (error) {
      logger.error(`Failed to get current price for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Fetch current prices for assets
   */
  async fetchCurrentPrices(): Promise<Map<string, MarketData>> {
    try {
      // Mock implementation for testing
      const mockData: MarketData[] = [
        {
          symbol: 'USDC',
          price: 1.00,
          change24h: 0.01,
          volume: 1000000,
          timestamp: Date.now()
        },
        {
          symbol: 'WBTC',
          price: 45000,
          change24h: 2.5,
          volume: 500000,
          timestamp: Date.now()
        }
      ];

      mockData.forEach(data => {
        this.cache.set(data.symbol, data);
      });

      this.lastUpdate = Date.now();
      logger.info('Market data updated successfully');

      return this.cache;
    } catch (error) {
      logger.error('Failed to fetch market data', { error });
      throw new GovernanceError('Market data fetch failed', 'MARKET_DATA_ERROR');
    }
  }

  /**
   * Get market data for a specific asset
   */
  getMarketData(symbol: string): MarketData | null {
    return this.cache.get(symbol) || null;
  }

  /**
   * Analyze market conditions for voting decisions
   */
  async analyzeMarketConditions(symbol: string): Promise<MarketAnalysis> {
    const data = this.getMarketData(symbol);

    if (!data) {
      return {
        recommendation: 'HOLD',
        confidence: 0.1,
        reasoning: 'No market data available'
      };
    }

    // Simple analysis logic
    if (data.change24h > 5) {
      return {
        recommendation: 'BUY',
        confidence: 0.8,
        reasoning: 'Strong positive momentum'
      };
    } else if (data.change24h < -5) {
      return {
        recommendation: 'SELL',
        confidence: 0.7,
        reasoning: 'Negative trend detected'
      };
    } else {
      return {
        recommendation: 'HOLD',
        confidence: 0.6,
        reasoning: 'Stable market conditions'
      };
    }
  }

  /**
   * Check if cache is valid
   */
  isCacheValid(): boolean {
    return Date.now() - this.lastUpdate < this.cacheExpiry;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.lastUpdate = 0;
    logger.info('Market data cache cleared');
  }
}