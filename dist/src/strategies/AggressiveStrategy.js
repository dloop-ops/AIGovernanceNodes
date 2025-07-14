"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AggressiveStrategy = void 0;
const BaseStrategy_js_1 = require("./BaseStrategy.js");
const index_js_1 = require("../types/index.js");
const logger_js_1 = require("../utils/logger.js");
class AggressiveStrategy extends BaseStrategy_js_1.BaseStrategy {
    constructor() {
        const config = {
            riskTolerance: 0.8,
            maxPositionSize: 0.4,
            diversificationThreshold: 0.15,
            rebalanceThreshold: 0.2,
            marketConditionWeights: {
                trending: 0.5,
                volatility: 0.2,
                volume: 0.3
            }
        };
        super('Aggressive', config);
    }
    async analyzeProposal(proposal, marketAnalysis, nodeContext) {
        try {
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
            if (riskScore > this.config.riskTolerance) {
                voteSupport = false;
                confidence = 0.6;
                reasoning = `Risk score (${riskScore.toFixed(2)}) exceeds even aggressive tolerance`;
            }
            else if (parseFloat(proposal.amount) > 5000) {
                voteSupport = false;
                confidence = 0.5;
                reasoning = 'Amount exceeds aggressive strategy limits';
            }
            else if (proposal.proposalType === index_js_1.ProposalType.INVEST.toString()) {
                const isGrowthAsset = proposal.description.toUpperCase().includes('WBTC') ||
                    proposal.description.toUpperCase().includes('PAXG');
                if (isGrowthAsset && marketAligned) {
                    voteSupport = true;
                    confidence = 0.9;
                    reasoning = 'Supporting growth asset investment with strong market signals';
                }
                else if (marketAnalysis && this.detectStrongTrend(marketAnalysis)) {
                    voteSupport = true;
                    confidence = 0.8;
                    reasoning = 'Strong market trend detected - capitalizing on momentum';
                }
                else if (votingMomentum.supportRatio > 0.7) {
                    voteSupport = true;
                    confidence = 0.7;
                    reasoning = 'Strong community support indicates potential opportunity';
                }
                else {
                    const isStableCoin = proposal.description.toUpperCase().includes('USDC') ||
                        proposal.description.toUpperCase().includes('EURT');
                    if (isStableCoin) {
                        voteSupport = true;
                        confidence = 0.4;
                        reasoning = 'Supporting stable coin investment for portfolio balance';
                    }
                    else {
                        voteSupport = false;
                        confidence = 0.3;
                        reasoning = 'Investment lacks strong growth potential or market support';
                    }
                }
            }
            else if (proposal.proposalType === index_js_1.ProposalType.DIVEST.toString()) {
                if (marketAnalysis && marketAnalysis.riskScore > 0.8) {
                    voteSupport = true;
                    confidence = 0.8;
                    reasoning = 'Supporting divestment due to extreme market risk';
                }
                else if (this.detectDowntrend(proposal, marketAnalysis)) {
                    voteSupport = true;
                    confidence = 0.7;
                    reasoning = 'Divestment aligned with bearish market conditions';
                }
                else if (votingMomentum.supportRatio > 0.6) {
                    voteSupport = true;
                    confidence = 0.5;
                    reasoning = 'Following community consensus on divestment';
                }
                else {
                    voteSupport = false;
                    confidence = 0.6;
                    reasoning = 'Divestment may reduce potential upside in current market';
                }
            }
            else if (proposal.proposalType === index_js_1.ProposalType.REBALANCE.toString()) {
                if (marketAnalysis && marketAnalysis.portfolioRebalance) {
                    voteSupport = true;
                    confidence = 0.8;
                    reasoning = 'Supporting rebalancing to optimize for current market conditions';
                }
                else if (this.hasVolatilityOpportunity(marketAnalysis)) {
                    voteSupport = true;
                    confidence = 0.7;
                    reasoning = 'Market volatility presents rebalancing opportunity';
                }
                else {
                    voteSupport = false;
                    confidence = 0.3;
                    reasoning = 'Current market conditions do not justify rebalancing';
                }
            }
            if (votingMomentum.votingActivity === 'high') {
                if (votingMomentum.supportRatio > 0.8) {
                    confidence += 0.1;
                    reasoning += ' (riding strong momentum)';
                }
                else if (votingMomentum.supportRatio < 0.3) {
                    if (!voteSupport) {
                        confidence += 0.1;
                        reasoning += ' (contrarian opportunity)';
                    }
                }
            }
            if (marketAnalysis && marketAnalysis.riskScore > 0.6 && marketAnalysis.riskScore < 0.8) {
                confidence += 0.05;
                reasoning += ' (volatility opportunity)';
            }
            if (this.isLastMinute(proposal) && voteSupport) {
                confidence += 0.05;
                reasoning += ' (quick decisive action)';
            }
            confidence = Math.max(0.1, Math.min(0.95, confidence));
            const decision = {
                shouldVote,
                voteSupport,
                confidence,
                reasoning
            };
            this.logVotingDecision(proposal, decision);
            return decision;
        }
        catch (error) {
            logger_js_1.strategyLogger.error(`Aggressive strategy analysis failed for proposal ${proposal.id}`, { error });
            return {
                shouldVote: false,
                voteSupport: false,
                confidence: 0,
                reasoning: 'Analysis failed due to error'
            };
        }
    }
    detectStrongTrend(marketAnalysis) {
        const recommendations = Object.values(marketAnalysis.recommendations);
        const strongBuys = recommendations.filter(r => r.action === 'buy' && r.confidence > 0.7).length;
        const strongSells = recommendations.filter(r => r.action === 'sell' && r.confidence > 0.7).length;
        return (strongBuys >= 3 || strongSells >= 3) && Math.abs(strongBuys - strongSells) >= 2;
    }
    detectDowntrend(proposal, marketAnalysis) {
        if (!marketAnalysis)
            return false;
        const assetSymbols = ['USDC', 'WBTC', 'PAXG', 'EURT'];
        let relevantAsset = null;
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
        const sellSignals = Object.values(marketAnalysis.recommendations)
            .filter(r => r.action === 'sell').length;
        return sellSignals >= 2;
    }
    hasVolatilityOpportunity(marketAnalysis) {
        if (!marketAnalysis)
            return false;
        if (marketAnalysis.riskScore >= 0.4 && marketAnalysis.riskScore <= 0.7) {
            const recommendations = Object.values(marketAnalysis.recommendations);
            const buyCount = recommendations.filter(r => r.action === 'buy').length;
            const sellCount = recommendations.filter(r => r.action === 'sell').length;
            return buyCount > 0 && sellCount > 0;
        }
        return false;
    }
    assessGrowthPotential(proposal, marketAnalysis) {
        let growthScore = 0.5;
        if (proposal.description.toUpperCase().includes('WBTC')) {
            growthScore += 0.3;
        }
        else if (proposal.description.toUpperCase().includes('PAXG')) {
            growthScore += 0.2;
        }
        else if (proposal.description.toUpperCase().includes('USDC') ||
            proposal.description.toUpperCase().includes('EURT')) {
            growthScore -= 0.1;
        }
        if (marketAnalysis) {
            const avgConfidence = Object.values(marketAnalysis.recommendations)
                .reduce((sum, rec) => sum + rec.confidence, 0) /
                Object.values(marketAnalysis.recommendations).length;
            if (avgConfidence > 0.7) {
                growthScore += 0.2;
            }
        }
        return Math.max(0, Math.min(1, growthScore));
    }
}
exports.AggressiveStrategy = AggressiveStrategy;
//# sourceMappingURL=AggressiveStrategy.js.map