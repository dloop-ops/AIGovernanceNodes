"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConservativeStrategy = void 0;
const BaseStrategy_js_1 = require("./BaseStrategy.js");
const index_js_1 = require("../types/index.js");
const logger_js_1 = require("../utils/logger.js");
class ConservativeStrategy extends BaseStrategy_js_1.BaseStrategy {
    constructor() {
        const config = {
            riskTolerance: 0.3,
            maxPositionSize: 0.15,
            diversificationThreshold: 0.25,
            rebalanceThreshold: 0.1,
            marketConditionWeights: {
                trending: 0.2,
                volatility: 0.5,
                volume: 0.3
            }
        };
        super('Conservative', config);
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
                confidence = 0.8;
                reasoning = `High risk score (${riskScore.toFixed(2)}) exceeds tolerance (${this.config.riskTolerance})`;
            }
            else if (parseFloat(proposal.amount) > 1000) {
                voteSupport = false;
                confidence = 0.7;
                reasoning = 'Amount too large for conservative strategy';
            }
            else if (marketAnalysis && marketAnalysis.riskScore > 0.6) {
                voteSupport = false;
                confidence = 0.6;
                reasoning = 'High market volatility detected, avoiding new positions';
            }
            else if (proposal.proposalType === index_js_1.ProposalType.INVEST.toString()) {
                const isStableCoin = proposal.description.toUpperCase().includes('USDC') ||
                    proposal.description.toUpperCase().includes('EURT');
                if (isStableCoin) {
                    voteSupport = true;
                    confidence = 0.8;
                    reasoning = 'Supporting stable coin investment - low risk';
                }
                else if (marketAligned && votingMomentum.supportRatio > 0.6) {
                    voteSupport = true;
                    confidence = 0.6;
                    reasoning = 'Market aligned investment with good community support';
                }
                else {
                    voteSupport = false;
                    confidence = 0.5;
                    reasoning = 'Non-stable asset investment without strong market signals';
                }
            }
            else if (proposal.proposalType === index_js_1.ProposalType.DIVEST.toString()) {
                if (marketAnalysis && marketAnalysis.riskScore > 0.5) {
                    voteSupport = true;
                    confidence = 0.8;
                    reasoning = 'Supporting divestment during uncertain market conditions';
                }
                else if (votingMomentum.supportRatio > 0.5) {
                    voteSupport = true;
                    confidence = 0.6;
                    reasoning = 'Supporting divestment with community consensus';
                }
                else {
                    voteSupport = false;
                    confidence = 0.4;
                    reasoning = 'Divestment not justified by current market conditions';
                }
            }
            else if (proposal.proposalType === index_js_1.ProposalType.REBALANCE.toString()) {
                if (marketAnalysis && marketAnalysis.portfolioRebalance) {
                    voteSupport = true;
                    confidence = 0.7;
                    reasoning = 'Supporting portfolio rebalancing based on market analysis';
                }
                else {
                    voteSupport = false;
                    confidence = 0.4;
                    reasoning = 'Rebalancing not supported by current market analysis';
                }
            }
            if (votingMomentum.votingActivity === 'high') {
                if (voteSupport === votingMomentum.supportRatio > 0.5) {
                    confidence += 0.1;
                }
                else {
                    confidence -= 0.1;
                }
            }
            if (this.isLastMinute(proposal)) {
                confidence *= 0.8;
                reasoning += ' (last-minute decision factor applied)';
            }
            confidence = Math.max(0.1, Math.min(0.9, confidence));
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
            logger_js_1.strategyLogger.error(`Conservative strategy analysis failed for proposal ${proposal.id}`, { error });
            return {
                shouldVote: false,
                voteSupport: false,
                confidence: 0,
                reasoning: 'Analysis failed due to error'
            };
        }
    }
    assessConservativeRisk(proposal, marketAnalysis) {
        let riskMultiplier = 1.0;
        if (proposal.description.toUpperCase().includes('WBTC')) {
            riskMultiplier += 0.3;
        }
        if (proposal.description.toUpperCase().includes('USDC') ||
            proposal.description.toUpperCase().includes('EURT')) {
            riskMultiplier -= 0.2;
        }
        if (marketAnalysis) {
            if (marketAnalysis.riskScore > 0.7) {
                riskMultiplier += 0.4;
            }
            else if (marketAnalysis.riskScore < 0.3) {
                riskMultiplier -= 0.2;
            }
        }
        return Math.max(0.1, Math.min(1.0, riskMultiplier));
    }
    fitsConservativeAllocation(proposal) {
        const amount = parseFloat(proposal.amount);
        if (amount > 500) {
            return false;
        }
        const isStableCoin = proposal.description.toUpperCase().includes('USDC') ||
            proposal.description.toUpperCase().includes('EURT');
        if (isStableCoin && proposal.proposalType === index_js_1.ProposalType.INVEST.toString()) {
            return true;
        }
        const isVolatileAsset = proposal.description.toUpperCase().includes('WBTC');
        if (isVolatileAsset && amount > 200) {
            return false;
        }
        return true;
    }
}
exports.ConservativeStrategy = ConservativeStrategy;
//# sourceMappingURL=ConservativeStrategy.js.map