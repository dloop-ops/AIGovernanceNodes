"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProposalService = void 0;
const MarketDataService_1 = require("./MarketDataService");
const index_1 = require("../types/index");
const logger_1 = require("../utils/logger");
class ProposalService {
    constructor(contractService, marketDataService) {
        this.proposalCache = new Map();
        this.cacheExpiry = 5 * 60 * 1000;
        if (!contractService) {
            throw new index_1.GovernanceError('ContractService is required', 'INVALID_CONSTRUCTOR_PARAMS');
        }
        this.contractService = contractService;
        this.marketDataService = marketDataService || new MarketDataService_1.MarketDataService();
    }
    async generateProposals(nodeId) {
        try {
            logger_1.governanceLogger.info('Generating investment proposals', { nodeId });
            const analysis = await this.marketDataService.analyzeMarketData();
            if (!analysis || Object.keys(analysis.recommendations).length === 0) {
                logger_1.governanceLogger.warn('No market analysis available for proposal generation', { nodeId });
                return [];
            }
            const proposals = [];
            for (const [asset, recommendation] of Object.entries(analysis.recommendations)) {
                const proposal = await this.createProposalFromRecommendation(asset, recommendation, analysis);
                if (proposal) {
                    proposals.push(proposal);
                }
            }
            if (analysis.portfolioRebalance && proposals.length > 0) {
                const rebalanceProposal = this.createRebalanceProposal(analysis);
                if (rebalanceProposal) {
                    proposals.push(rebalanceProposal);
                }
            }
            logger_1.governanceLogger.info(`Generated ${proposals.length} proposals`, {
                nodeId,
                proposalTypes: proposals.map(p => index_1.ProposalType[p.proposalType])
            });
            return proposals;
        }
        catch (error) {
            throw new index_1.GovernanceError(`Failed to generate proposals: ${error instanceof Error ? error.message : String(error)}`, 'PROPOSAL_GENERATION_ERROR');
        }
    }
    async getAllProposals() {
        try {
            const proposals = await this.contractService.getProposals();
            return proposals || [];
        }
        catch (error) {
            throw new index_1.GovernanceError('Failed to get all proposals', 'PROPOSAL_FETCH_ERROR');
        }
    }
    async getActiveProposals() {
        const allProposals = await this.getAllProposals();
        return allProposals.filter(proposal => proposal.state === index_1.ProposalState.ACTIVE &&
            proposal.votingEnds > Math.floor(Date.now() / 1000));
    }
    async getProposalById(id) {
        try {
            if (this.proposalCache.has(id)) {
                const cached = this.proposalCache.get(id);
                if (Date.now() - cached.timestamp < this.cacheExpiry) {
                    return cached.data;
                }
            }
            const proposal = await this.contractService.getProposal(id.toString());
            if (!proposal) {
                throw new index_1.GovernanceError('Proposal not found', 'PROPOSAL_NOT_FOUND');
            }
            this.proposalCache.set(id, {
                data: proposal,
                timestamp: Date.now()
            });
            return proposal;
        }
        catch (error) {
            throw new index_1.GovernanceError(`Failed to get proposal ${id}`, 'PROPOSAL_FETCH_ERROR');
        }
    }
    async getProposalsByState(state) {
        const allProposals = await this.getAllProposals();
        return allProposals.filter(proposal => proposal.state === state);
    }
    async getUrgentProposals(secondsRemaining) {
        const activeProposals = await this.getActiveProposals();
        const currentTime = Math.floor(Date.now() / 1000);
        return activeProposals.filter(proposal => {
            const timeLeft = proposal.votingEnds - currentTime;
            return timeLeft <= secondsRemaining && timeLeft > 0;
        });
    }
    async getProposalsByProposer(proposerAddress) {
        const allProposals = await this.getAllProposals();
        return allProposals.filter(proposal => proposal.proposer.toLowerCase() === proposerAddress.toLowerCase());
    }
    async analyzeProposal(proposalId) {
        const proposal = await this.getProposalById(proposalId);
        return {
            proposalId,
            totalVotes: proposal.forVotes + proposal.againstVotes,
            participation: (proposal.forVotes + proposal.againstVotes) / proposal.totalSupply,
            trend: proposal.forVotes > proposal.againstVotes ? 'positive' : 'negative'
        };
    }
    async getVotingTrends() {
        const allProposals = await this.getAllProposals();
        const totalProposals = allProposals.length;
        const totalParticipation = allProposals.reduce((sum, proposal) => sum + (proposal.forVotes + proposal.againstVotes), 0);
        return {
            averageParticipation: totalParticipation / totalProposals,
            totalProposals,
            activeProposals: allProposals.filter(p => p.state === index_1.ProposalState.ACTIVE).length
        };
    }
    isProposalActiveForVoting(proposal) {
        const currentTime = Math.floor(Date.now() / 1000);
        return proposal.state === index_1.ProposalState.ACTIVE &&
            proposal.votingEnds > currentTime &&
            proposal.votingStarts <= currentTime;
    }
    invalidateCache() {
        this.proposalCache.clear();
    }
    async makeVotingDecision(proposal) {
        try {
            if (!this.isProposalActiveForVoting(proposal)) {
                return {
                    vote: 'ABSTAIN',
                    confidence: 0,
                    reasoning: 'Proposal is not active for voting'
                };
            }
            let vote = 'FOR';
            let confidence = 0.7;
            let reasoning = 'Standard approval for active proposal';
            if (this.marketDataService) {
                try {
                    await this.marketDataService.getCurrentPrice('ETH');
                    confidence = 0.8;
                    reasoning = 'Decision enhanced with market data';
                }
                catch (error) {
                    reasoning = 'Market data unavailable, using basic voting logic';
                }
            }
            return {
                vote,
                confidence,
                reasoning
            };
        }
        catch (error) {
            return {
                vote: 'ABSTAIN',
                confidence: 0,
                reasoning: `Error making voting decision: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
    async createProposalFromRecommendation(asset, recommendation, analysis) {
        try {
            if (recommendation.confidence < 0.6) {
                logger_1.governanceLogger.debug(`Skipping proposal for ${asset} due to low confidence`, {
                    confidence: recommendation.confidence
                });
                return null;
            }
            const assetAddress = this.contractService.getAssetAddress(asset);
            const baseAmount = this.calculateInvestmentAmount(asset, recommendation, analysis);
            let proposalType;
            let description;
            if (recommendation.action === 'buy') {
                proposalType = index_1.ProposalType.INVEST;
                description = `Investment proposal for ${asset}: ${recommendation.reasoning}. ` +
                    `Confidence: ${(recommendation.confidence * 100).toFixed(1)}%. ` +
                    `Risk Score: ${analysis.riskScore.toFixed(2)}. ` +
                    `Recommended allocation: ${recommendation.allocatedPercentage?.toFixed(1)}%.`;
            }
            else if (recommendation.action === 'sell') {
                proposalType = index_1.ProposalType.DIVEST;
                description = `Divestment proposal for ${asset}: ${recommendation.reasoning}. ` +
                    `Confidence: ${(recommendation.confidence * 100).toFixed(1)}%. ` +
                    `Risk Score: ${analysis.riskScore.toFixed(2)}. ` +
                    `Recommended reduction: ${recommendation.allocatedPercentage?.toFixed(1)}%.`;
            }
            else {
                return null;
            }
            const proposal = {
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
        }
        catch (error) {
            logger_1.governanceLogger.error(`Failed to create proposal for ${asset}`, { error, recommendation });
            return null;
        }
    }
    createRebalanceProposal(analysis) {
        try {
            const allocations = Object.entries(analysis.recommendations)
                .filter(([_, rec]) => rec.allocatedPercentage)
                .map(([asset, rec]) => `${asset}: ${rec.allocatedPercentage?.toFixed(1)}%`)
                .join(', ');
            const description = `Portfolio rebalancing proposal based on current market conditions. ` +
                `Overall risk score: ${analysis.riskScore.toFixed(2)}. ` +
                `Recommended allocations: ${allocations}. ` +
                `Analysis: Multiple assets showing significant trends requiring rebalancing.`;
            const placeholderAsset = this.contractService.getAssetAddress('USDC');
            return {
                proposalType: index_1.ProposalType.REBALANCE,
                assetAddress: placeholderAsset,
                amount: '0',
                description,
                additionalData: JSON.stringify({
                    rebalance: {
                        type: 'full_portfolio',
                        riskScore: analysis.riskScore,
                        allocations: Object.fromEntries(Object.entries(analysis.recommendations)
                            .filter(([_, rec]) => rec.allocatedPercentage)
                            .map(([asset, rec]) => [asset, rec.allocatedPercentage]))
                    },
                    metadata: {
                        generatedAt: new Date().toISOString(),
                        analysisTimestamp: analysis.timestamp
                    }
                })
            };
        }
        catch (error) {
            logger_1.governanceLogger.error('Failed to create rebalance proposal', { error });
            return null;
        }
    }
    calculateInvestmentAmount(asset, recommendation, analysis) {
        const baseAmounts = {
            'USDC': 1000,
            'WBTC': 0.02,
            'PAXG': 0.5,
            'EURT': 800
        };
        const baseAmount = baseAmounts[asset] || 500;
        const confidenceMultiplier = Math.max(0.6, recommendation.confidence);
        const riskMultiplier = Math.max(0.5, 1 - (analysis.riskScore * 0.5));
        const allocationMultiplier = recommendation.allocatedPercentage ?
            (recommendation.allocatedPercentage / 25) : 1;
        const finalAmount = baseAmount * confidenceMultiplier * riskMultiplier * allocationMultiplier;
        return Math.max(0.01, finalAmount);
    }
    summarizeMarketConditions(analysis) {
        const conditions = [];
        if (analysis.riskScore > 0.7) {
            conditions.push('high volatility');
        }
        else if (analysis.riskScore < 0.3) {
            conditions.push('low volatility');
        }
        const buySignals = Object.values(analysis.recommendations)
            .filter(r => r.action === 'buy').length;
        const sellSignals = Object.values(analysis.recommendations)
            .filter(r => r.action === 'sell').length;
        if (buySignals > sellSignals) {
            conditions.push('bullish sentiment');
        }
        else if (sellSignals > buySignals) {
            conditions.push('bearish sentiment');
        }
        else {
            conditions.push('neutral sentiment');
        }
        return conditions.join(', ') || 'stable conditions';
    }
    validateProposal(proposal) {
        try {
            if (!proposal.assetAddress || !proposal.description) {
                return false;
            }
            const amount = parseFloat(proposal.amount);
            if (isNaN(amount) || amount < 0) {
                return false;
            }
            if (![index_1.ProposalType.INVEST, index_1.ProposalType.DIVEST, index_1.ProposalType.REBALANCE].includes(proposal.proposalType)) {
                return false;
            }
            if (proposal.description.length < 50 || proposal.description.length > 1000) {
                return false;
            }
            return true;
        }
        catch (error) {
            logger_1.governanceLogger.error('Proposal validation failed', { error, proposal });
            return false;
        }
    }
    prioritizeProposals(proposals) {
        return proposals.sort((a, b) => {
            try {
                const aData = a.additionalData ? JSON.parse(a.additionalData) : {};
                const bData = b.additionalData ? JSON.parse(b.additionalData) : {};
                const aConfidence = aData.analysis?.confidence || 0;
                const bConfidence = bData.analysis?.confidence || 0;
                if (aConfidence !== bConfidence) {
                    return bConfidence - aConfidence;
                }
                if (a.proposalType === index_1.ProposalType.REBALANCE && b.proposalType !== index_1.ProposalType.REBALANCE) {
                    return 1;
                }
                if (b.proposalType === index_1.ProposalType.REBALANCE && a.proposalType !== index_1.ProposalType.REBALANCE) {
                    return -1;
                }
                return 0;
            }
            catch (error) {
                logger_1.governanceLogger.error('Error prioritizing proposals', { error });
                return 0;
            }
        });
    }
    getProposalSummary(proposal) {
        const type = index_1.ProposalType[proposal.proposalType];
        const amount = parseFloat(proposal.amount).toFixed(4);
        return `${type} proposal: ${amount} ETH for asset ${proposal.assetAddress.substring(0, 10)}...`;
    }
}
exports.ProposalService = ProposalService;
//# sourceMappingURL=ProposalService.js.map