"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketDataService = void 0;
const index_1 = require("../types/index");
const logger_1 = __importDefault(require("../utils/logger"));
class MarketDataService {
    constructor() {
        this.cache = new Map();
        this.cacheExpiry = 5 * 60 * 1000;
        this.lastUpdate = 0;
        logger_1.default.info('MarketDataService initialized');
    }
    async analyzeMarketData() {
        try {
            const prices = await this.fetchCurrentPrices();
            const analysis = {
                marketTrend: 'neutral',
                volatility: 'low',
                recommendation: 'moderate',
                prices: Object.fromEntries(prices)
            };
            logger_1.default.info('Market analysis completed:', analysis);
            return analysis;
        }
        catch (error) {
            logger_1.default.error('Failed to analyze market data:', error);
            throw error;
        }
    }
    async getCurrentPrice(symbol) {
        try {
            const prices = await this.fetchCurrentPrices();
            const marketData = prices.get(symbol.toUpperCase());
            return marketData?.price || 0;
        }
        catch (error) {
            logger_1.default.error(`Failed to get current price for ${symbol}:`, error);
            throw error;
        }
    }
    async fetchCurrentPrices() {
        try {
            const mockData = [
                {
                    symbol: 'USDC',
                    price: 1.0,
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
            mockData.forEach((data) => {
                this.cache.set(data.symbol, data);
            });
            this.lastUpdate = Date.now();
            logger_1.default.info('Market data updated successfully');
            return this.cache;
        }
        catch (error) {
            logger_1.default.error('Failed to fetch market data', { error });
            throw new index_1.GovernanceError('Market data fetch failed', 'MARKET_DATA_ERROR');
        }
    }
    getMarketData(symbol) {
        return this.cache.get(symbol) || null;
    }
    async analyzeMarketConditions(symbol) {
        const data = this.getMarketData(symbol);
        if (!data) {
            return {
                recommendation: 'HOLD',
                confidence: 0.1,
                reasoning: 'No market data available'
            };
        }
        if (data.change24h > 5) {
            return {
                recommendation: 'BUY',
                confidence: 0.8,
                reasoning: 'Strong positive momentum'
            };
        }
        else if (data.change24h < -5) {
            return {
                recommendation: 'SELL',
                confidence: 0.7,
                reasoning: 'Negative trend detected'
            };
        }
        else {
            return {
                recommendation: 'HOLD',
                confidence: 0.6,
                reasoning: 'Stable market conditions'
            };
        }
    }
    isCacheValid() {
        return Date.now() - this.lastUpdate < this.cacheExpiry;
    }
    clearCache() {
        this.cache.clear();
        this.lastUpdate = 0;
        logger_1.default.info('Market data cache cleared');
    }
}
exports.MarketDataService = MarketDataService;
//# sourceMappingURL=MarketDataService.js.map