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
export declare class MarketDataService {
    private cache;
    private cacheExpiry;
    private lastUpdate;
    constructor();
    analyzeMarketData(): Promise<any>;
    getCurrentPrice(symbol: string): Promise<number>;
    fetchCurrentPrices(): Promise<Map<string, MarketData>>;
    getMarketData(symbol: string): MarketData | null;
    analyzeMarketConditions(symbol: string): Promise<MarketAnalysis>;
    isCacheValid(): boolean;
    clearCache(): void;
}
//# sourceMappingURL=MarketDataService.d.ts.map