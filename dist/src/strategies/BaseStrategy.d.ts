import { Proposal, MarketAnalysis, StrategyConfig } from '../types/index.js';
export declare abstract class BaseStrategy {
    protected config: StrategyConfig;
    protected strategyName: string;
    constructor(strategyName: string, config: StrategyConfig);
    /**
     * Abstract method to be implemented by specific strategies
     */
    abstract analyzeProposal(proposal: Proposal, marketAnalysis: MarketAnalysis | null, nodeContext?: any): Promise<{
        shouldVote: boolean;
        voteSupport: boolean;
        confidence: number;
        reasoning: string;
    }>;
    /**
     * Common validation for all strategies
     */
    protected validateProposal(proposal: Proposal): boolean;
    /**
     * Calculate risk score for a proposal
     */
    protected calculateProposalRisk(proposal: Proposal, marketAnalysis: MarketAnalysis | null): number;
    /**
     * Analyze voting momentum
     */
    protected analyzeVotingMomentum(proposal: Proposal): {
        totalVotes: number;
        supportRatio: number;
        votingActivity: 'low' | 'medium' | 'high';
    };
    /**
     * Check if proposal aligns with market trends
     */
    protected isAlignedWithMarket(proposal: Proposal, marketAnalysis: MarketAnalysis | null): boolean;
    /**
     * Calculate time until voting deadline
     */
    protected getTimeToDeadline(proposal: Proposal): number;
    /**
     * Check if this is a last-minute decision
     */
    protected isLastMinute(proposal: Proposal): boolean;
    /**
     * Get strategy configuration
     */
    getConfig(): StrategyConfig;
    /**
     * Get strategy name
     */
    getStrategyName(): string;
    /**
     * Update strategy configuration
     */
    updateConfig(newConfig: Partial<StrategyConfig>): void;
    /**
     * Log voting decision
     */
    protected logVotingDecision(proposal: Proposal, decision: {
        shouldVote: boolean;
        voteSupport: boolean;
        confidence: number;
        reasoning: string;
    }): void;
}
//# sourceMappingURL=BaseStrategy.d.ts.map