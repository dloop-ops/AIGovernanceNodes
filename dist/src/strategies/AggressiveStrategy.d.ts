import { BaseStrategy } from './BaseStrategy.js';
import { Proposal, MarketAnalysis } from '../types/index.js';
export declare class AggressiveStrategy extends BaseStrategy {
    constructor();
    analyzeProposal(proposal: Proposal, marketAnalysis: MarketAnalysis | null, nodeContext?: any): Promise<{
        shouldVote: boolean;
        voteSupport: boolean;
        confidence: number;
        reasoning: string;
    }>;
    /**
     * Detect strong market trends for aggressive positioning
     */
    private detectStrongTrend;
    /**
     * Detect downtrend for divestment decisions
     */
    private detectDowntrend;
    /**
     * Check if market volatility presents opportunities
     */
    private hasVolatilityOpportunity;
    /**
     * Assess growth potential of the proposal
     */
    private assessGrowthPotential;
}
//# sourceMappingURL=AggressiveStrategy.d.ts.map