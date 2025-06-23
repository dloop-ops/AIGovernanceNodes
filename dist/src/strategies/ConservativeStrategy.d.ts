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
    /**
     * Conservative-specific risk assessment
     */
    private assessConservativeRisk;
    /**
     * Check if proposal fits conservative portfolio allocation
     */
    private fitsConservativeAllocation;
}
//# sourceMappingURL=ConservativeStrategy.d.ts.map