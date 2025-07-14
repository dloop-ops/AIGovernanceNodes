import { BaseStrategy } from './BaseStrategy.js';
import { Proposal, ProposalType, MarketAnalysis, StrategyConfig } from '../types/index.js';
import { strategyLogger as logger } from '../utils/logger.js';

export class AggressiveStrategy extends BaseStrategy {
  constructor() {
    const config: StrategyConfig = {
      riskTolerance: 0.8, // High risk tolerance
      maxPositionSize: 0.4, // Max 40% position size
      diversificationThreshold: 0.15, // Less emphasis on diversification
      rebalanceThreshold: 0.2, // More aggressive rebalancing
      marketConditionWeights: {
        trending: 0.5, // High weight on trends
        volatility: 0.2, // Lower weight on volatility (embrace volatility)
        volume: 0.3 // Moderate weight on volume
      }
    };

    super('Aggressive', config);
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

      // Aggressive strategy: seek high returns, accept higher risk

      // Risk assessment - embrace calculated risks
      if (riskScore > this.config.riskTolerance) {
        voteSupport = false;
        confidence = 0.6;
        reasoning = `Risk score (${riskScore.toFixed(2)}) exceeds even aggressive tolerance`;
      }
      // Large position analysis - aggressive sizing
      else if (parseFloat(proposal.amount) > 5000) {
        voteSupport = false;
        confidence = 0.5;
        reasoning = 'Amount exceeds aggressive strategy limits';
      }
      // Investment analysis - favor growth assets
      else if (proposal.proposalType === ProposalType.INVEST.toString()) {
        const isGrowthAsset =
          proposal.description.toUpperCase().includes('WBTC') ||
          proposal.description.toUpperCase().includes('PAXG');

        if (isGrowthAsset && marketAligned) {
          voteSupport = true;
          confidence = 0.9;
          reasoning = 'Supporting growth asset investment with strong market signals';
        } else if (marketAnalysis && this.detectStrongTrend(marketAnalysis)) {
          voteSupport = true;
          confidence = 0.8;
          reasoning = 'Strong market trend detected - capitalizing on momentum';
        } else if (votingMomentum.supportRatio > 0.7) {
          voteSupport = true;
          confidence = 0.7;
          reasoning = 'Strong community support indicates potential opportunity';
        } else {
          // Still consider stable coins but with lower enthusiasm
          const isStableCoin =
            proposal.description.toUpperCase().includes('USDC') ||
            proposal.description.toUpperCase().includes('EURT');
          if (isStableCoin) {
            voteSupport = true;
            confidence = 0.4;
            reasoning = 'Supporting stable coin investment for portfolio balance';
          } else {
            voteSupport = false;
            confidence = 0.3;
            reasoning = 'Investment lacks strong growth potential or market support';
          }
        }
      }
      // Divestment analysis - avoid during potential uptrends
      else if (proposal.proposalType === ProposalType.DIVEST.toString()) {
        if (marketAnalysis && marketAnalysis.riskScore > 0.8) {
          voteSupport = true;
          confidence = 0.8;
          reasoning = 'Supporting divestment due to extreme market risk';
        } else if (this.detectDowntrend(proposal, marketAnalysis)) {
          voteSupport = true;
          confidence = 0.7;
          reasoning = 'Divestment aligned with bearish market conditions';
        } else if (votingMomentum.supportRatio > 0.6) {
          voteSupport = true;
          confidence = 0.5;
          reasoning = 'Following community consensus on divestment';
        } else {
          voteSupport = false;
          confidence = 0.6;
          reasoning = 'Divestment may reduce potential upside in current market';
        }
      }
      // Rebalancing - support aggressive rebalancing for optimization
      else if (proposal.proposalType === ProposalType.REBALANCE.toString()) {
        if (marketAnalysis && marketAnalysis.portfolioRebalance) {
          voteSupport = true;
          confidence = 0.8;
          reasoning = 'Supporting rebalancing to optimize for current market conditions';
        } else if (this.hasVolatilityOpportunity(marketAnalysis)) {
          voteSupport = true;
          confidence = 0.7;
          reasoning = 'Market volatility presents rebalancing opportunity';
        } else {
          voteSupport = false;
          confidence = 0.3;
          reasoning = 'Current market conditions do not justify rebalancing';
        }
      }

      // Momentum trading adjustments
      if (votingMomentum.votingActivity === 'high') {
        if (votingMomentum.supportRatio > 0.8) {
          confidence += 0.1; // Strong momentum
          reasoning += ' (riding strong momentum)';
        } else if (votingMomentum.supportRatio < 0.3) {
          // Contrarian opportunity
          if (!voteSupport) {
            confidence += 0.1;
            reasoning += ' (contrarian opportunity)';
          }
        }
      }

      // Volatility bonus - aggressive strategy can benefit from volatility
      if (marketAnalysis && marketAnalysis.riskScore > 0.6 && marketAnalysis.riskScore < 0.8) {
        confidence += 0.05;
        reasoning += ' (volatility opportunity)';
      }

      // Time pressure - aggressive strategy can make quick decisions
      if (this.isLastMinute(proposal) && voteSupport) {
        confidence += 0.05; // Slight boost for decisive action
        reasoning += ' (quick decisive action)';
      }

      // Final confidence bounds
      confidence = Math.max(0.1, Math.min(0.95, confidence));

      const decision = {
        shouldVote,
        voteSupport,
        confidence,
        reasoning
      };

      this.logVotingDecision(proposal, decision);
      return decision;
    } catch (error) {
      logger.error(`Aggressive strategy analysis failed for proposal ${proposal.id}`, { error });
      return {
        shouldVote: false,
        voteSupport: false,
        confidence: 0,
        reasoning: 'Analysis failed due to error'
      };
    }
  }

  /**
   * Detect strong market trends for aggressive positioning
   */
  private detectStrongTrend(marketAnalysis: MarketAnalysis): boolean {
    const recommendations = Object.values(marketAnalysis.recommendations);

    // Count strong buy/sell signals
    const strongBuys = recommendations.filter(
      (r) => r.action === 'buy' && r.confidence > 0.7
    ).length;

    const strongSells = recommendations.filter(
      (r) => r.action === 'sell' && r.confidence > 0.7
    ).length;

    // Strong trend if majority of assets have strong signals in same direction
    return (strongBuys >= 3 || strongSells >= 3) && Math.abs(strongBuys - strongSells) >= 2;
  }

  /**
   * Detect downtrend for divestment decisions
   */
  private detectDowntrend(proposal: Proposal, marketAnalysis: MarketAnalysis | null): boolean {
    if (!marketAnalysis) return false;

    // Look for asset-specific downtrend signals
    const assetSymbols = ['USDC', 'WBTC', 'PAXG', 'EURT'];
    let relevantAsset: string | null = null;

    for (const symbol of assetSymbols) {
      if (proposal.description.toUpperCase().includes(symbol)) {
        relevantAsset = symbol;
        break;
      }
    }

    if (relevantAsset && marketAnalysis.recommendations[relevantAsset]) {
      const recommendation = marketAnalysis.recommendations[relevantAsset];
      return recommendation.action === 'sell' && recommendation.confidence > 0.6;
    }

    // General market downtrend
    const sellSignals = Object.values(marketAnalysis.recommendations).filter(
      (r) => r.action === 'sell'
    ).length;

    return sellSignals >= 2;
  }

  /**
   * Check if market volatility presents opportunities
   */
  private hasVolatilityOpportunity(marketAnalysis: MarketAnalysis | null): boolean {
    if (!marketAnalysis) return false;

    // Moderate to high volatility with mixed signals can present rebalancing opportunities
    if (marketAnalysis.riskScore >= 0.4 && marketAnalysis.riskScore <= 0.7) {
      const recommendations = Object.values(marketAnalysis.recommendations);
      const buyCount = recommendations.filter((r) => r.action === 'buy').length;
      const sellCount = recommendations.filter((r) => r.action === 'sell').length;

      // Mixed signals in volatile market = rebalancing opportunity
      return buyCount > 0 && sellCount > 0;
    }

    return false;
  }

  /**
   * Assess growth potential of the proposal
   */
  private assessGrowthPotential(proposal: Proposal, marketAnalysis: MarketAnalysis | null): number {
    let growthScore = 0.5; // Base score

    // Asset type assessment
    if (proposal.description.toUpperCase().includes('WBTC')) {
      growthScore += 0.3; // Bitcoin has high growth potential
    } else if (proposal.description.toUpperCase().includes('PAXG')) {
      growthScore += 0.2; // Gold has moderate growth potential
    } else if (
      proposal.description.toUpperCase().includes('USDC') ||
      proposal.description.toUpperCase().includes('EURT')
    ) {
      growthScore -= 0.1; // Stable coins have limited growth
    }

    // Market condition adjustment
    if (marketAnalysis) {
      const avgConfidence =
        Object.values(marketAnalysis.recommendations).reduce(
          (sum, rec) => sum + rec.confidence,
          0
        ) / Object.values(marketAnalysis.recommendations).length;

      if (avgConfidence > 0.7) {
        growthScore += 0.2; // High confidence in market direction
      }
    }

    return Math.max(0, Math.min(1, growthScore));
  }
}
