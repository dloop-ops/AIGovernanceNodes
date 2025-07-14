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
    private detectStrongTrend;
    private detectDowntrend;
    private hasVolatilityOpportunity;
    private assessGrowthPotential;
}
//# sourceMappingURL=AggressiveStrategy.d.ts.map