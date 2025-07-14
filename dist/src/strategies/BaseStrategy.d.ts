import { Proposal, MarketAnalysis, StrategyConfig } from '../types/index.js';
export declare abstract class BaseStrategy {
    protected config: StrategyConfig;
    protected strategyName: string;
    constructor(strategyName: string, config: StrategyConfig);
    abstract analyzeProposal(proposal: Proposal, marketAnalysis: MarketAnalysis | null, nodeContext?: any): Promise<{
        shouldVote: boolean;
        voteSupport: boolean;
        confidence: number;
        reasoning: string;
    }>;
    protected validateProposal(proposal: Proposal): boolean;
    protected calculateProposalRisk(proposal: Proposal, marketAnalysis: MarketAnalysis | null): number;
    protected analyzeVotingMomentum(proposal: Proposal): {
        totalVotes: number;
        supportRatio: number;
        votingActivity: 'low' | 'medium' | 'high';
    };
    protected isAlignedWithMarket(proposal: Proposal, marketAnalysis: MarketAnalysis | null): boolean;
    protected getTimeToDeadline(proposal: Proposal): number;
    protected isLastMinute(proposal: Proposal): boolean;
    getConfig(): StrategyConfig;
    getStrategyName(): string;
    updateConfig(newConfig: Partial<StrategyConfig>): void;
    protected logVotingDecision(proposal: Proposal, decision: {
        shouldVote: boolean;
        voteSupport: boolean;
        confidence: number;
        reasoning: string;
    }): void;
}
//# sourceMappingURL=BaseStrategy.d.ts.map