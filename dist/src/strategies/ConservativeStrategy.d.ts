import { BaseStrategy } from './BaseStrategy.js';
import { Proposal, MarketAnalysis } from '../types/index.js';
export declare class ConservativeStrategy extends BaseStrategy {
    constructor();
    analyzeProposal(proposal: Proposal, marketAnalysis: MarketAnalysis | null, nodeContext?: any): Promise<{
        shouldVote: boolean;
        voteSupport: boolean;
        confidence: number;
        reasoning: string;
    }>;
    private assessConservativeRisk;
    private fitsConservativeAllocation;
}
//# sourceMappingURL=ConservativeStrategy.d.ts.map