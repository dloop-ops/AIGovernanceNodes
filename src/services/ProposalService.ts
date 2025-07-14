import { ContractService } from './ContractService';
import { MarketDataService } from './MarketDataService';
import {
  ProposalParams,
  ProposalType,
  ProposalState,
  MarketAnalysis,
  GovernanceError
} from '../types/index';
import { governanceLogger as logger } from '../utils/logger';

export class ProposalService {
  private contractService: ContractService;
  private marketDataService: MarketDataService;
  private proposalCache: Map<number, any> = new Map();
  private cacheExpiry: number = 5 * 60 * 1000; // 5 minutes

  constructor(contractService: ContractService, marketDataService?: MarketDataService) {
    if (!contractService) {
      throw new GovernanceError('ContractService is required', 'INVALID_CONSTRUCTOR_PARAMS');
    }
    this.contractService = contractService;
    this.marketDataService = marketDataService || new MarketDataService();
  }

  /**
   * Generate investment proposals based on market analysis
   */
  async generateProposals(nodeId: string): Promise<ProposalParams[]> {
    try {
      logger.info('Generating investment proposals', { nodeId });

      // Get market analysis
      const analysis = await this.marketDataService.analyzeMarketData();

      if (!analysis || Object.keys(analysis.recommendations).length === 0) {
        logger.warn('No market analysis available for proposal generation', { nodeId });
        return [];
      }

      const proposals: ProposalParams[] = [];

      // Convert market recommendations to proposals
      for (const [asset, recommendation] of Object.entries(analysis.recommendations)) {
        const proposal = await this.createProposalFromRecommendation(
          asset,
          recommendation,
          analysis
        );
        if (proposal) {
          proposals.push(proposal);
        }
      }

      // Add portfolio rebalance proposal if needed
      if (analysis.portfolioRebalance && proposals.length > 0) {
        const rebalanceProposal = this.createRebalanceProposal(analysis);
        if (rebalanceProposal) {
          proposals.push(rebalanceProposal);
        }
      }

      logger.info(`Generated ${proposals.length} proposals`, {
        nodeId,
        proposalTypes: proposals.map((p) => ProposalType[p.proposalType])
      });

      return proposals;
    } catch (error) {
      throw new GovernanceError(
        `Failed to generate proposals: ${error instanceof Error ? error.message : String(error)}`,
        'PROPOSAL_GENERATION_ERROR'
      );
    }
  }

  async getAllProposals(): Promise<any[]> {
    try {
      const proposals = await this.contractService.getProposals();
      return proposals || [];
    } catch (error) {
      throw new GovernanceError('Failed to get all proposals', 'PROPOSAL_FETCH_ERROR');
    }
  }

  async getActiveProposals(): Promise<any[]> {
    const allProposals = await this.getAllProposals();
    return allProposals.filter(
      (proposal) =>
        proposal.state === ProposalState.ACTIVE &&
        proposal.votingEnds > Math.floor(Date.now() / 1000)
    );
  }

  async getProposalById(id: number): Promise<any> {
    try {
      if (this.proposalCache.has(id)) {
        const cached = this.proposalCache.get(id);
        if (Date.now() - cached.timestamp < this.cacheExpiry) {
          return cached.data;
        }
      }

      const proposal = await this.contractService.getProposal(id.toString());
      if (!proposal) {
        throw new GovernanceError('Proposal not found', 'PROPOSAL_NOT_FOUND');
      }

      this.proposalCache.set(id, {
        data: proposal,
        timestamp: Date.now()
      });

      return proposal;
    } catch (error) {
      throw new GovernanceError(`Failed to get proposal ${id}`, 'PROPOSAL_FETCH_ERROR');
    }
  }

  async getProposalsByState(state: ProposalState): Promise<any[]> {
    const allProposals = await this.getAllProposals();
    return allProposals.filter((proposal) => proposal.state === state);
  }

  async getUrgentProposals(secondsRemaining: number): Promise<any[]> {
    const activeProposals = await this.getActiveProposals();
    const currentTime = Math.floor(Date.now() / 1000);

    return activeProposals.filter((proposal) => {
      const timeLeft = proposal.votingEnds - currentTime;
      return timeLeft <= secondsRemaining && timeLeft > 0;
    });
  }

  async getProposalsByProposer(proposerAddress: string): Promise<any[]> {
    const allProposals = await this.getAllProposals();
    return allProposals.filter(
      (proposal) => proposal.proposer.toLowerCase() === proposerAddress.toLowerCase()
    );
  }

  async analyzeProposal(proposalId: number): Promise<any> {
    const proposal = await this.getProposalById(proposalId);

    return {
      proposalId,
      totalVotes: proposal.forVotes + proposal.againstVotes,
      participation: (proposal.forVotes + proposal.againstVotes) / proposal.totalSupply,
      trend: proposal.forVotes > proposal.againstVotes ? 'positive' : 'negative'
    };
  }

  async getVotingTrends(): Promise<any> {
    const allProposals = await this.getAllProposals();
    const totalProposals = allProposals.length;
    const totalParticipation = allProposals.reduce(
      (sum, proposal) => sum + (proposal.forVotes + proposal.againstVotes),
      0
    );

    return {
      averageParticipation: totalParticipation / totalProposals,
      totalProposals,
      activeProposals: allProposals.filter((p) => p.state === ProposalState.ACTIVE).length
    };
  }

  isProposalActiveForVoting(proposal: any): boolean {
    const currentTime = Math.floor(Date.now() / 1000);
    return (
      proposal.state === ProposalState.ACTIVE &&
      proposal.votingEnds > currentTime &&
      proposal.votingStarts <= currentTime
    );
  }

  invalidateCache(): void {
    this.proposalCache.clear();
  }

  async makeVotingDecision(
    proposal: any
  ): Promise<{ vote: string; confidence: number; reasoning: string }> {
    try {
      // Check if proposal is active
      if (!this.isProposalActiveForVoting(proposal)) {
        return {
          vote: 'ABSTAIN',
          confidence: 0,
          reasoning: 'Proposal is not active for voting'
        };
      }

      // Simple voting logic based on proposal type
      const vote = 'FOR';
      let confidence = 0.7;
      let reasoning = 'Standard approval for active proposal';

      // Try to get market data if available
      if (this.marketDataService) {
        try {
          await this.marketDataService.getCurrentPrice('ETH');
          confidence = 0.8;
          reasoning = 'Decision enhanced with market data';
        } catch (error) {
          // Market data failed, use basic logic
          reasoning = 'Market data unavailable, using basic voting logic';
        }
      }

      return {
        vote,
        confidence,
        reasoning
      };
    } catch (error) {
      return {
        vote: 'ABSTAIN',
        confidence: 0,
        reasoning: `Error making voting decision: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      };
    }
  }

  /**
   * Create a proposal from market recommendation
   */
  private async createProposalFromRecommendation(
    asset: string,
    recommendation: any,
    analysis: MarketAnalysis
  ): Promise<ProposalParams | null> {
    try {
      // Skip if confidence is too low
      if (recommendation.confidence < 0.6) {
        logger.debug(`Skipping proposal for ${asset} due to low confidence`, {
          confidence: recommendation.confidence
        });
        return null;
      }

      // Get asset address
      const assetAddress = this.contractService.getAssetAddress(asset);

      // Calculate investment amount based on confidence and allocation
      const baseAmount = this.calculateInvestmentAmount(asset, recommendation, analysis);

      let proposalType: ProposalType;
      let description: string;

      if (recommendation.action === 'buy') {
        proposalType = ProposalType.INVEST;
        description =
          `Investment proposal for ${asset}: ${recommendation.reasoning}. ` +
          `Confidence: ${(recommendation.confidence * 100).toFixed(1)}%. ` +
          `Risk Score: ${analysis.riskScore.toFixed(2)}. ` +
          `Recommended allocation: ${recommendation.allocatedPercentage?.toFixed(1)}%.`;
      } else if (recommendation.action === 'sell') {
        proposalType = ProposalType.DIVEST;
        description =
          `Divestment proposal for ${asset}: ${recommendation.reasoning}. ` +
          `Confidence: ${(recommendation.confidence * 100).toFixed(1)}%. ` +
          `Risk Score: ${analysis.riskScore.toFixed(2)}. ` +
          `Recommended reduction: ${recommendation.allocatedPercentage?.toFixed(1)}%.`;
      } else {
        // Hold - no proposal needed
        return null;
      }

      const proposal: ProposalParams = {
        proposalType,
        assetAddress,
        amount: baseAmount.toString(),
        description,
        additionalData: JSON.stringify({
          analysis: {
            confidence: recommendation.confidence,
            riskScore: analysis.riskScore,
            reasoning: recommendation.reasoning,
            marketConditions: this.summarizeMarketConditions(analysis)
          },
          metadata: {
            generatedAt: new Date().toISOString(),
            asset,
            allocatedPercentage: recommendation.allocatedPercentage
          }
        })
      };

      return proposal;
    } catch (error) {
      logger.error(`Failed to create proposal for ${asset}`, { error, recommendation });
      return null;
    }
  }

  /**
   * Create a portfolio rebalance proposal
   */
  private createRebalanceProposal(analysis: MarketAnalysis): ProposalParams | null {
    try {
      // Calculate optimal portfolio distribution
      const allocations = Object.entries(analysis.recommendations)
        .filter(([_, rec]) => rec.allocatedPercentage)
        .map(([asset, rec]) => `${asset}: ${rec.allocatedPercentage?.toFixed(1)}%`)
        .join(', ');

      const description =
        `Portfolio rebalancing proposal based on current market conditions. ` +
        `Overall risk score: ${analysis.riskScore.toFixed(2)}. ` +
        `Recommended allocations: ${allocations}. ` +
        `Analysis: Multiple assets showing significant trends requiring rebalancing.`;

      // Use a placeholder asset address for rebalance proposals
      const placeholderAsset = this.contractService.getAssetAddress('USDC');

      return {
        proposalType: ProposalType.REBALANCE,
        assetAddress: placeholderAsset,
        amount: '0', // Rebalance doesn't require specific amount
        description,
        additionalData: JSON.stringify({
          rebalance: {
            type: 'full_portfolio',
            riskScore: analysis.riskScore,
            allocations: Object.fromEntries(
              Object.entries(analysis.recommendations)
                .filter(([_, rec]) => rec.allocatedPercentage)
                .map(([asset, rec]) => [asset, rec.allocatedPercentage])
            )
          },
          metadata: {
            generatedAt: new Date().toISOString(),
            analysisTimestamp: analysis.timestamp
          }
        })
      };
    } catch (error) {
      logger.error('Failed to create rebalance proposal', { error });
      return null;
    }
  }

  /**
   * Calculate investment amount based on various factors
   */
  private calculateInvestmentAmount(
    asset: string,
    recommendation: any,
    analysis: MarketAnalysis
  ): number {
    // Base amounts per asset (in ETH equivalent for simplicity)
    const baseAmounts = {
      USDC: 1000, // $1000 equivalent
      WBTC: 0.02, // ~$1000 worth of BTC
      PAXG: 0.5, // ~$1000 worth of gold
      EURT: 800 // ~$1000 worth of EUR
    };

    const baseAmount = baseAmounts[asset as keyof typeof baseAmounts] || 500;

    // Adjust based on confidence (0.6 to 1.0 confidence -> 0.6x to 1.0x base amount)
    const confidenceMultiplier = Math.max(0.6, recommendation.confidence);

    // Adjust based on risk (lower risk allows higher investment)
    const riskMultiplier = Math.max(0.5, 1 - analysis.riskScore * 0.5);

    // Adjust based on allocated percentage
    const allocationMultiplier = recommendation.allocatedPercentage
      ? recommendation.allocatedPercentage / 25
      : 1; // Normalize to base 25% allocation

    const finalAmount = baseAmount * confidenceMultiplier * riskMultiplier * allocationMultiplier;

    return Math.max(0.01, finalAmount); // Minimum investment
  }

  /**
   * Summarize market conditions for proposal metadata
   */
  private summarizeMarketConditions(analysis: MarketAnalysis): string {
    const conditions: string[] = [];

    if (analysis.riskScore > 0.7) {
      conditions.push('high volatility');
    } else if (analysis.riskScore < 0.3) {
      conditions.push('low volatility');
    }

    const buySignals = Object.values(analysis.recommendations).filter(
      (r) => r.action === 'buy'
    ).length;
    const sellSignals = Object.values(analysis.recommendations).filter(
      (r) => r.action === 'sell'
    ).length;

    if (buySignals > sellSignals) {
      conditions.push('bullish sentiment');
    } else if (sellSignals > buySignals) {
      conditions.push('bearish sentiment');
    } else {
      conditions.push('neutral sentiment');
    }

    return conditions.join(', ') || 'stable conditions';
  }

  /**
   * Validate proposal parameters
   */
  validateProposal(proposal: ProposalParams): boolean {
    try {
      // Basic validation
      if (!proposal.assetAddress || !proposal.description) {
        return false;
      }

      // Amount validation
      const amount = parseFloat(proposal.amount);
      if (isNaN(amount) || amount < 0) {
        return false;
      }

      // Proposal type validation
      if (
        ![ProposalType.INVEST, ProposalType.DIVEST, ProposalType.REBALANCE].includes(
          proposal.proposalType
        )
      ) {
        return false;
      }

      // Description length validation
      if (proposal.description.length < 50 || proposal.description.length > 1000) {
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Proposal validation failed', { error, proposal });
      return false;
    }
  }

  /**
   * Prioritize proposals based on confidence and market conditions
   */
  prioritizeProposals(proposals: ProposalParams[]): ProposalParams[] {
    return proposals.sort((a, b) => {
      try {
        // Parse additional data to get confidence scores
        const aData = a.additionalData ? JSON.parse(a.additionalData) : {};
        const bData = b.additionalData ? JSON.parse(b.additionalData) : {};

        const aConfidence = aData.analysis?.confidence || 0;
        const bConfidence = bData.analysis?.confidence || 0;

        // Prioritize by confidence, then by proposal type
        if (aConfidence !== bConfidence) {
          return bConfidence - aConfidence;
        }

        // Rebalance proposals get lower priority
        if (
          a.proposalType === ProposalType.REBALANCE &&
          b.proposalType !== ProposalType.REBALANCE
        ) {
          return 1;
        }
        if (
          b.proposalType === ProposalType.REBALANCE &&
          a.proposalType !== ProposalType.REBALANCE
        ) {
          return -1;
        }

        return 0;
      } catch (error) {
        logger.error('Error prioritizing proposals', { error });
        return 0;
      }
    });
  }

  /**
   * Get proposal summary for logging
   */
  getProposalSummary(proposal: ProposalParams): string {
    const type = ProposalType[proposal.proposalType];
    const amount = parseFloat(proposal.amount).toFixed(4);
    return `${type} proposal: ${amount} ETH for asset ${proposal.assetAddress.substring(0, 10)}...`;
  }
}
