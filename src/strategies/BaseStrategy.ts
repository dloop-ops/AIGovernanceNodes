import { Proposal, ProposalType, ProposalState, MarketAnalysis, StrategyConfig, GovernanceError } from '../types/index.js';
import { strategyLogger as logger } from '../utils/logger.js';

export abstract class BaseStrategy {
  protected config: StrategyConfig;
  protected strategyName: string;

  constructor(strategyName: string, config: StrategyConfig) {
    this.strategyName = strategyName;
    this.config = config;
  }

  /**
   * Abstract method to be implemented by specific strategies
   */
  abstract analyzeProposal(
    proposal: Proposal,
    marketAnalysis: MarketAnalysis | null,
    nodeContext?: any
  ): Promise<{
    shouldVote: boolean;
    voteSupport: boolean;
    confidence: number;
    reasoning: string;
  }>;

  /**
   * Common validation for all strategies
   */
  protected validateProposal(proposal: Proposal): boolean {
    try {
      // Enhanced logging for validation failures with USDC prioritization
      const isUSDCProposal = proposal.description.toUpperCase().includes('USDC');
      logger.debug(`Validating proposal ${proposal.id}`, {
        proposalId: proposal.id,
        state: proposal.state,
        proposalType: proposal.proposalType,
        amount: proposal.amount,
        startTime: proposal.startTime,
        endTime: proposal.endTime,
        executed: proposal.executed,
        cancelled: proposal.cancelled,
        isUSDCProposal
      });

      // Check if proposal is in active state
      if (proposal.state !== ProposalState.ACTIVE) {
        logger.debug(`Proposal ${proposal.id} not in active state`, {
          currentState: ProposalState[proposal.state]
        });
        return false;
      }

      // Check if voting period has ended - be more lenient with timing
      const now = Date.now() / 1000; // Convert to seconds
      if (proposal.endTime > 0 && now > proposal.endTime) {
        logger.debug(`Proposal ${proposal.id} voting period has ended`, {
          now: now,
          endTime: proposal.endTime,
          timeRemaining: proposal.endTime - now
        });
        return false;
      }

      // Check if proposal has already been executed or cancelled
      if (proposal.executed || proposal.cancelled) {
        logger.debug(`Proposal ${proposal.id} already executed or cancelled`, {
          executed: proposal.executed,
          cancelled: proposal.cancelled
        });
        return false;
      }

      // Validate proposal has required fields
      if (!proposal.description || proposal.description.trim().length < 10) {
        logger.debug(`Proposal ${proposal.id} has insufficient description`);
        return false;
      }

      if (!proposal.assetAddress || proposal.assetAddress === '0x0000000000000000000000000000000000000000') {
        logger.debug(`Proposal ${proposal.id} has invalid asset address`);
        return false;
      }

      // More lenient amount validation - accept smaller amounts and handle string conversion better
      const amount = parseFloat(proposal.amount || '0');
      if (isNaN(amount)) {
        logger.warn(`Proposal ${proposal.id} has invalid amount format: ${proposal.amount}`);
        return false;
      }

      // Special handling for USDC proposals - allow even smaller amounts for stable coin
      const minAmount = isUSDCProposal ? 0.001 : 0.01; // Allow smaller USDC amounts
      const maxAmount = isUSDCProposal ? 500000 : 100000; // Allow larger USDC amounts

      if (amount < minAmount || amount > maxAmount) {
        logger.debug(`Proposal ${proposal.id} has amount outside acceptable range: ${amount}`, {
          minAmount,
          maxAmount,
          isUSDCProposal
        });
        return false;
      }

      // Validate proposal type is defined
      if (proposal.proposalType === undefined || proposal.proposalType === null) {
        logger.debug(`Proposal ${proposal.id} has invalid proposal type: ${proposal.proposalType}`);
        return false;
      }

      // Additional validation: ensure voting data exists and is valid
      const votesFor = parseFloat(proposal.votesFor || '0');
      const votesAgainst = parseFloat(proposal.votesAgainst || '0');
      
      if (isNaN(votesFor) || isNaN(votesAgainst) || votesFor < 0 || votesAgainst < 0) {
        logger.debug(`Proposal ${proposal.id} has invalid voting data`, {
          votesFor: proposal.votesFor,
          votesAgainst: proposal.votesAgainst
        });
        return false;
      }

      logger.debug(`Proposal ${proposal.id} passed all validation checks`);
      return true;
    } catch (error) {
      logger.error(`Error validating proposal ${proposal.id}`, { 
        error: error instanceof Error ? error.message : String(error),
        proposal: {
          id: proposal.id,
          state: proposal.state,
          amount: proposal.amount,
          proposalType: proposal.proposalType
        }
      });
      return false;
    }
  }

  /**
   * Calculate risk score for a proposal
   */
  protected calculateProposalRisk(
    proposal: Proposal,
    marketAnalysis: MarketAnalysis | null
  ): number {
    let riskScore = 0.5; // Base risk score

    try {
      // Amount-based risk
      const amount = parseFloat(proposal.amount);
      if (amount > 1000) {
        riskScore += 0.2; // Higher risk for large amounts
      } else if (amount < 10) {
        riskScore -= 0.1; // Lower risk for small amounts
      }

      // Proposal type risk
      switch (proposal.proposalType) {
        case ProposalType.INVEST:
          riskScore += 0.1; // Investing has inherent risk
          break;
        case ProposalType.DIVEST:
          riskScore -= 0.1; // Divesting reduces risk
          break;
        case ProposalType.REBALANCE:
          riskScore += 0.05; // Rebalancing has moderate risk
          break;
      }

      // Market-based risk adjustment
      if (marketAnalysis) {
        riskScore += marketAnalysis.riskScore * 0.3; // Factor in market risk
      }

      // Voting momentum risk (if proposal is failing badly)
      const totalVotes = parseFloat(proposal.votesFor) + parseFloat(proposal.votesAgainst);
      if (totalVotes > 0) {
        const supportRatio = parseFloat(proposal.votesFor) / totalVotes;
        if (supportRatio < 0.3) {
          riskScore += 0.2; // Higher risk if proposal is failing
        }
      }

      return Math.max(0, Math.min(1, riskScore)); // Clamp between 0 and 1
    } catch (error) {
      logger.error('Error calculating proposal risk', { error, proposalId: proposal.id });
      return 0.5; // Return neutral risk on error
    }
  }

  /**
   * Analyze voting momentum
   */
  protected analyzeVotingMomentum(proposal: Proposal): {
    totalVotes: number;
    supportRatio: number;
    votingActivity: 'low' | 'medium' | 'high';
  } {
    try {
      const votesFor = parseFloat(proposal.votesFor);
      const votesAgainst = parseFloat(proposal.votesAgainst);
      const totalVotes = votesFor + votesAgainst;
      
      const supportRatio = totalVotes > 0 ? votesFor / totalVotes : 0.5;
      
      // Classify voting activity based on total votes
      let votingActivity: 'low' | 'medium' | 'high' = 'low';
      if (totalVotes > 1000) {
        votingActivity = 'high';
      } else if (totalVotes > 100) {
        votingActivity = 'medium';
      }

      return {
        totalVotes,
        supportRatio,
        votingActivity
      };
    } catch (error) {
      logger.error('Error analyzing voting momentum', { error, proposalId: proposal.id });
      return {
        totalVotes: 0,
        supportRatio: 0.5,
        votingActivity: 'low'
      };
    }
  }

  /**
   * Check if proposal aligns with market trends
   */
  protected isAlignedWithMarket(
    proposal: Proposal,
    marketAnalysis: MarketAnalysis | null
  ): boolean {
    if (!marketAnalysis) {
      return true; // Neutral if no market data
    }

    try {
      // Try to extract asset symbol from proposal (this is a simplified approach)
      const assetSymbols = ['USDC', 'WBTC', 'PAXG', 'EURT'];
      let relevantAsset = null;

      // Look for asset mention in description
      for (const symbol of assetSymbols) {
        if (proposal.description.toUpperCase().includes(symbol)) {
          relevantAsset = symbol;
          break;
        }
      }

      if (!relevantAsset) {
        return true; // Can't determine asset, assume neutral
      }

      const recommendation = marketAnalysis.recommendations[relevantAsset];
      if (!recommendation) {
        return true; // No recommendation for this asset
      }

      // Check alignment
      switch (proposal.proposalType) {
        case ProposalType.INVEST:
          return recommendation.action === 'buy';
        case ProposalType.DIVEST:
          return recommendation.action === 'sell';
        case ProposalType.REBALANCE:
          return recommendation.action !== 'hold';
        default:
          return true;
      }
    } catch (error) {
      logger.error('Error checking market alignment', { error, proposalId: proposal.id });
      return true; // Default to aligned on error
    }
  }

  /**
   * Calculate time until voting deadline
   */
  protected getTimeToDeadline(proposal: Proposal): number {
    const now = Date.now() / 1000; // Current time in seconds
    return Math.max(0, proposal.endTime - now);
  }

  /**
   * Check if this is a last-minute decision
   */
  protected isLastMinute(proposal: Proposal): boolean {
    const timeLeft = this.getTimeToDeadline(proposal);
    const votingPeriod = proposal.endTime - proposal.startTime;
    
    // Consider last 10% of voting period as "last minute"
    return timeLeft < (votingPeriod * 0.1);
  }

  /**
   * Get strategy configuration
   */
  getConfig(): StrategyConfig {
    return { ...this.config };
  }

  /**
   * Get strategy name
   */
  getStrategyName(): string {
    return this.strategyName;
  }

  /**
   * Update strategy configuration
   */
  updateConfig(newConfig: Partial<StrategyConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info(`Strategy configuration updated for ${this.strategyName}`, { 
      newConfig 
    });
  }

  /**
   * Log voting decision
   */
  protected logVotingDecision(
    proposal: Proposal,
    decision: {
      shouldVote: boolean;
      voteSupport: boolean;
      confidence: number;
      reasoning: string;
    }
  ): void {
    logger.info(`Voting decision for proposal ${proposal.id}`, {
      strategy: this.strategyName,
      proposalType: ProposalType[proposal.proposalType],
      amount: proposal.amount,
      shouldVote: decision.shouldVote,
      voteSupport: decision.voteSupport,
      confidence: decision.confidence,
      reasoning: decision.reasoning
    });
  }
}
