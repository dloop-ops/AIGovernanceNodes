"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseStrategy = void 0;
const index_js_1 = require("../types/index.js");
const logger_js_1 = require("../utils/logger.js");
class BaseStrategy {
    constructor(strategyName, config) {
        this.strategyName = strategyName;
        this.config = config;
    }
    validateProposal(proposal) {
        try {
            const isUSDCProposal = proposal.description.toUpperCase().includes('USDC');
            logger_js_1.strategyLogger.debug(`Validating proposal ${proposal.id}`, {
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
            if (proposal.state !== index_js_1.ProposalState.ACTIVE) {
                logger_js_1.strategyLogger.debug(`Proposal ${proposal.id} not in active state`, {
                    currentState: proposal.state !== undefined ? index_js_1.ProposalState[proposal.state] || 'UNKNOWN' : 'UNKNOWN'
                });
                return false;
            }
            const now = Date.now() / 1000;
            if (proposal.endTime > 0 && now > proposal.endTime) {
                logger_js_1.strategyLogger.debug(`Proposal ${proposal.id} voting period has ended`, {
                    now: now,
                    endTime: proposal.endTime,
                    timeRemaining: proposal.endTime - now
                });
                return false;
            }
            if (proposal.executed || proposal.cancelled) {
                logger_js_1.strategyLogger.debug(`Proposal ${proposal.id} already executed or cancelled`, {
                    executed: proposal.executed,
                    cancelled: proposal.cancelled
                });
                return false;
            }
            if (!proposal.description || proposal.description.trim().length < 10) {
                logger_js_1.strategyLogger.debug(`Proposal ${proposal.id} has insufficient description`);
                return false;
            }
            if (!proposal.assetAddress ||
                proposal.assetAddress === '0x0000000000000000000000000000000000000000') {
                logger_js_1.strategyLogger.debug(`Proposal ${proposal.id} has invalid asset address`);
                return false;
            }
            const amount = parseFloat(proposal.amount || '0');
            if (isNaN(amount)) {
                logger_js_1.strategyLogger.warn(`Proposal ${proposal.id} has invalid amount format: ${proposal.amount}`);
                return false;
            }
            const minAmount = isUSDCProposal ? 0.001 : 0.01;
            const maxAmount = isUSDCProposal ? 500000 : 100000;
            if (amount < minAmount || amount > maxAmount) {
                logger_js_1.strategyLogger.debug(`Proposal ${proposal.id} has amount outside acceptable range: ${amount}`, {
                    minAmount,
                    maxAmount,
                    isUSDCProposal
                });
                return false;
            }
            if (proposal.proposalType === undefined || proposal.proposalType === null) {
                logger_js_1.strategyLogger.debug(`Proposal ${proposal.id} has invalid proposal type: ${proposal.proposalType}`);
                return false;
            }
            const votesFor = parseFloat(proposal.votesFor || '0');
            const votesAgainst = parseFloat(proposal.votesAgainst || '0');
            if (isNaN(votesFor) || isNaN(votesAgainst) || votesFor < 0 || votesAgainst < 0) {
                logger_js_1.strategyLogger.debug(`Proposal ${proposal.id} has invalid voting data`, {
                    votesFor: proposal.votesFor,
                    votesAgainst: proposal.votesAgainst
                });
                return false;
            }
            logger_js_1.strategyLogger.debug(`Proposal ${proposal.id} passed all validation checks`);
            return true;
        }
        catch (error) {
            logger_js_1.strategyLogger.error(`Error validating proposal ${proposal.id}`, {
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
    calculateProposalRisk(proposal, marketAnalysis) {
        let riskScore = 0.5;
        try {
            const amount = parseFloat(proposal.amount);
            if (amount > 1000) {
                riskScore += 0.2;
            }
            else if (amount < 10) {
                riskScore -= 0.1;
            }
            switch (proposal.proposalType) {
                case index_js_1.ProposalType.INVEST.toString():
                case '0':
                    riskScore += 0.1;
                    break;
                case index_js_1.ProposalType.DIVEST.toString():
                case '1':
                    riskScore -= 0.1;
                    break;
                case index_js_1.ProposalType.REBALANCE.toString():
                case '2':
                    riskScore += 0.05;
                    break;
            }
            if (marketAnalysis) {
                riskScore += marketAnalysis.riskScore * 0.3;
            }
            const totalVotes = parseFloat(proposal.votesFor) + parseFloat(proposal.votesAgainst);
            if (totalVotes > 0) {
                const supportRatio = parseFloat(proposal.votesFor) / totalVotes;
                if (supportRatio < 0.3) {
                    riskScore += 0.2;
                }
            }
            return Math.max(0, Math.min(1, riskScore));
        }
        catch (error) {
            logger_js_1.strategyLogger.error('Error calculating proposal risk', { error, proposalId: proposal.id });
            return 0.5;
        }
    }
    analyzeVotingMomentum(proposal) {
        try {
            const votesFor = parseFloat(proposal.votesFor);
            const votesAgainst = parseFloat(proposal.votesAgainst);
            const totalVotes = votesFor + votesAgainst;
            const supportRatio = totalVotes > 0 ? votesFor / totalVotes : 0.5;
            let votingActivity = 'low';
            if (totalVotes > 1000) {
                votingActivity = 'high';
            }
            else if (totalVotes > 100) {
                votingActivity = 'medium';
            }
            return {
                totalVotes,
                supportRatio,
                votingActivity
            };
        }
        catch (error) {
            logger_js_1.strategyLogger.error('Error analyzing voting momentum', { error, proposalId: proposal.id });
            return {
                totalVotes: 0,
                supportRatio: 0.5,
                votingActivity: 'low'
            };
        }
    }
    isAlignedWithMarket(proposal, marketAnalysis) {
        if (!marketAnalysis) {
            return true;
        }
        try {
            const assetSymbols = ['USDC', 'WBTC', 'PAXG', 'EURT'];
            let relevantAsset = null;
            if (proposal.description) {
                for (const symbol of assetSymbols) {
                    if (proposal.description.toUpperCase().includes(symbol)) {
                        relevantAsset = symbol || null;
                        break;
                    }
                }
            }
            if (!relevantAsset) {
                return true;
            }
            const recommendation = marketAnalysis.recommendations[relevantAsset];
            if (!recommendation) {
                return true;
            }
            switch (proposal.proposalType) {
                case index_js_1.ProposalType.INVEST.toString():
                case '0':
                    return recommendation.action === 'buy';
                case index_js_1.ProposalType.DIVEST.toString():
                case '1':
                    return recommendation.action === 'sell';
                case index_js_1.ProposalType.REBALANCE.toString():
                case '2':
                    return recommendation.action !== 'hold';
                default:
                    return true;
            }
        }
        catch (error) {
            logger_js_1.strategyLogger.error('Error checking market alignment', { error, proposalId: proposal.id });
            return true;
        }
    }
    getTimeToDeadline(proposal) {
        const now = Date.now() / 1000;
        return Math.max(0, proposal.endTime - now);
    }
    isLastMinute(proposal) {
        const timeLeft = this.getTimeToDeadline(proposal);
        const votingPeriod = proposal.endTime - (proposal.startTime || 0);
        return timeLeft < votingPeriod * 0.1;
    }
    getConfig() {
        return { ...this.config };
    }
    getStrategyName() {
        return this.strategyName;
    }
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        logger_js_1.strategyLogger.info(`Strategy configuration updated for ${this.strategyName}`, {
            newConfig
        });
    }
    logVotingDecision(proposal, decision) {
        logger_js_1.strategyLogger.info(`Voting decision for proposal ${proposal.id}`, {
            strategy: this.strategyName,
            proposalType: index_js_1.ProposalType[proposal.proposalType],
            amount: proposal.amount,
            shouldVote: decision.shouldVote,
            voteSupport: decision.voteSupport,
            confidence: decision.confidence,
            reasoning: decision.reasoning
        });
    }
}
exports.BaseStrategy = BaseStrategy;
//# sourceMappingURL=BaseStrategy.js.map