import { BaseStrategy } from './BaseStrategy.js';
import { Proposal, ProposalType, MarketAnalysis, StrategyConfig } from '../types/index.js';
import { strategyLogger as logger } from '../utils/logger.js';

export class ConservativeStrategy extends BaseStrategy {
  constructor() {
    const config: StrategyConfig = {
      riskTolerance: 0.3, // Low risk tolerance
      maxPositionSize: 0.15, // Max 15% position size
      diversificationThreshold: 0.25, // Prefer diversification
      rebalanceThreshold: 0.1, // Conservative rebalancing
      marketConditionWeights: {
        trending: 0.2, // Less weight on trends
        volatility: 0.5, // High weight on volatility (avoid high volatility)
        volume: 0.3 // Moderate weight on volume
      }
    };

    super('Conservative', config);
  }

  async analyzeProposal(
    proposal: Proposal,
    marketAnalysis: MarketAnalysis | null,
    nodeContext?: any
  ): Promise<{
    shouldVote: boolean;
    voteSupport: boolean;
    confidence: number;
    reasoning: string;
  }> {
    try {
      // Basic validation
      if (!this.validateProposal(proposal)) {
        return {
          shouldVote: false,
          voteSupport: false,
          confidence: 0,
          reasoning: 'Proposal failed basic validation'
        };
      }

      const riskScore = this.calculateProposalRisk(proposal, marketAnalysis);
      const votingMomentum = this.analyzeVotingMomentum(proposal);
      const marketAligned = this.isAlignedWithMarket(proposal, marketAnalysis);

      const shouldVote = true;
      let voteSupport = false;
      let confidence = 0.5;
      let reasoning = '';

      // Conservative strategy: prioritize safety and stability

      // Risk assessment - reject high-risk proposals
      if (riskScore > this.config.riskTolerance) {
        voteSupport = false;
        confidence = 0.8;
        reasoning = `High risk score (${riskScore.toFixed(2)}) exceeds tolerance (${
          this.config.riskTolerance
        })`;
      }
      // Amount check - be cautious with large investments
      else if (parseFloat(proposal.amount) > 1000) {
        voteSupport = false;
        confidence = 0.7;
        reasoning = 'Amount too large for conservative strategy';
      }
      // Market volatility check
      else if (marketAnalysis && marketAnalysis.riskScore > 0.6) {
        voteSupport = false;
        confidence = 0.6;
        reasoning = 'High market volatility detected, avoiding new positions';
      }
      // Stable coin preference for investments
      else if (proposal.proposalType === ProposalType.INVEST.toString()) {
        const isStableCoin =
          proposal.description.toUpperCase().includes('USDC') ||
          proposal.description.toUpperCase().includes('EURT');

        if (isStableCoin) {
          voteSupport = true;
          confidence = 0.8;
          reasoning = 'Supporting stable coin investment - low risk';
        } else if (marketAligned && votingMomentum.supportRatio > 0.6) {
          voteSupport = true;
          confidence = 0.6;
          reasoning = 'Market aligned investment with good community support';
        } else {
          voteSupport = false;
          confidence = 0.5;
          reasoning = 'Non-stable asset investment without strong market signals';
        }
      }
      // Divestment analysis - generally supportive of risk reduction
      else if (proposal.proposalType === ProposalType.DIVEST.toString()) {
        if (marketAnalysis && marketAnalysis.riskScore > 0.5) {
          voteSupport = true;
          confidence = 0.8;
          reasoning = 'Supporting divestment during uncertain market conditions';
        } else if (votingMomentum.supportRatio > 0.5) {
          voteSupport = true;
          confidence = 0.6;
          reasoning = 'Supporting divestment with community consensus';
        } else {
          voteSupport = false;
          confidence = 0.4;
          reasoning = 'Divestment not justified by current market conditions';
        }
      }
      // Rebalancing - support if conservative
      else if (proposal.proposalType === ProposalType.REBALANCE.toString()) {
        if (marketAnalysis && marketAnalysis.portfolioRebalance) {
          voteSupport = true;
          confidence = 0.7;
          reasoning = 'Supporting portfolio rebalancing based on market analysis';
        } else {
          voteSupport = false;
          confidence = 0.4;
          reasoning = 'Rebalancing not supported by current market analysis';
        }
      }

      // Adjust confidence based on voting momentum
      if (votingMomentum.votingActivity === 'high') {
        if (voteSupport === votingMomentum.supportRatio > 0.5) {
          confidence += 0.1; // Boost confidence if aligned with majority
        } else {
          confidence -= 0.1; // Reduce confidence if against majority
        }
      }

      // Time pressure adjustment - reduce confidence in last-minute decisions
      if (this.isLastMinute(proposal)) {
        confidence *= 0.8;
        reasoning += ' (last-minute decision factor applied)';
      }

      // Final confidence bounds
      confidence = Math.max(0.1, Math.min(0.9, confidence));

      const decision = {
        shouldVote,
        voteSupport,
        confidence,
        reasoning
      };

      this.logVotingDecision(proposal, decision);
      return decision;
    } catch (error) {
      logger.error(`Conservative strategy analysis failed for proposal ${proposal.id}`, { error });
      return {
        shouldVote: false,
        voteSupport: false,
        confidence: 0,
        reasoning: 'Analysis failed due to error'
      };
    }
  }

  /**
   * Conservative-specific risk assessment
   */
  private assessConservativeRisk(
    proposal: Proposal,
    marketAnalysis: MarketAnalysis | null
  ): number {
    let riskMultiplier = 1.0;

    // Higher risk for volatile assets
    if (proposal.description.toUpperCase().includes('WBTC')) {
      riskMultiplier += 0.3; // Bitcoin is volatile
    }

    // Lower risk for stable assets
    if (
      proposal.description.toUpperCase().includes('USDC') ||
      proposal.description.toUpperCase().includes('EURT')
    ) {
      riskMultiplier -= 0.2; // Stable coins are safer
    }

    // Market condition adjustment
    if (marketAnalysis) {
      if (marketAnalysis.riskScore > 0.7) {
        riskMultiplier += 0.4; // Very risky market
      } else if (marketAnalysis.riskScore < 0.3) {
        riskMultiplier -= 0.2; // Stable market
      }
    }

    return Math.max(0.1, Math.min(1.0, riskMultiplier));
  }

  /**
   * Check if proposal fits conservative portfolio allocation
   */
  private fitsConservativeAllocation(proposal: Proposal): boolean {
    const amount = parseFloat(proposal.amount);

    // Conservative strategy prefers smaller, incremental changes
    if (amount > 500) {
      // Large position
      return false;
    }

    // Prefer stable coin allocations over 30%
    const isStableCoin =
      proposal.description.toUpperCase().includes('USDC') ||
      proposal.description.toUpperCase().includes('EURT');

    if (isStableCoin && proposal.proposalType === ProposalType.INVEST.toString()) {
      return true;
    }

    // Limit exposure to volatile assets
    const isVolatileAsset = proposal.description.toUpperCase().includes('WBTC');
    if (isVolatileAsset && amount > 200) {
      return false;
    }

    return true;
  }
}
