"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GovernanceNode = void 0;
const ConservativeStrategy_js_1 = require("../strategies/ConservativeStrategy.js");
const AggressiveStrategy_js_1 = require("../strategies/AggressiveStrategy.js");
const index_js_1 = require("../types/index.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
class GovernanceNode {
    constructor(config, walletService, contractService, marketDataService, proposalService) {
        this.isActive = false;
        this.nodeId = config.id;
        this.nodeIndex = config.walletIndex;
        this.walletService = walletService;
        this.wallet = walletService.getWallet(config.walletIndex);
        this.contractService = contractService;
        this.marketDataService = marketDataService;
        this.proposalService = proposalService;
        this.strategy = this.createStrategy(config.strategy);
        this.state = {
            nodeId: this.nodeId,
            wallet: this.wallet,
            strategy: config.strategy,
            isActive: config.enabled,
            lastProposalTime: 0,
            lastVoteTime: 0,
            proposalsCreated: 0,
            votesAcast: 0
        };
        logger_js_1.default.info('Governance node initialized', {
            nodeId: this.nodeId,
            address: this.wallet.address,
            strategy: config.strategy,
            enabled: config.enabled
        });
    }
    createStrategy(strategyType) {
        switch (strategyType.toLowerCase()) {
            case 'conservative':
                return new ConservativeStrategy_js_1.ConservativeStrategy();
            case 'aggressive':
                return new AggressiveStrategy_js_1.AggressiveStrategy();
            default:
                logger_js_1.default.warn(`Unknown strategy type: ${strategyType}, defaulting to conservative`);
                return new ConservativeStrategy_js_1.ConservativeStrategy();
        }
    }
    async start() {
        try {
            const REGISTERED_ADDRESSES = [
                '0x0E354b735a6eee60726e6e3A431e3320Ba26ba45',
                '0xb1c25B40A79b7D046E539A9fbBB58789efFD0874',
                '0x65b1d03F5F2Ad4Ff036ea7AeEf5Ec07Db27a5C58',
                '0x766766f2815f835E4A0b1360833C7A15DDF2b72a',
                '0xA6fBf2dD68dB92dA309D6b82DAe2180d903a36FA'
            ];
            if (REGISTERED_ADDRESSES.includes(this.wallet.address)) {
                logger_js_1.default.info(`🛑 Node ${this.nodeId} - COMPLETE SKIP OF ALL REGISTRATION (already registered)`, {
                    component: 'governance',
                    nodeAddress: this.wallet.address,
                    action: 'NUCLEAR_SKIP_ALL_REGISTRATION'
                });
                this.isActive = true;
                this.state.isActive = true;
                logger_js_1.default.info(`Governance node ${this.nodeId} started successfully WITHOUT REGISTRATION`, {
                    component: 'governance'
                });
                return;
            }
            logger_js_1.default.info(`Starting governance node ${this.nodeId}`, {
                component: 'governance'
            });
            await this.checkBalances();
            this.isActive = true;
            this.state.isActive = true;
            logger_js_1.default.info(`Governance node ${this.nodeId} started successfully`, {
                component: 'governance'
            });
        }
        catch (error) {
            this.isActive = false;
            this.state.isActive = false;
            logger_js_1.default.error(`Failed to start governance node ${this.nodeId}`, {
                component: 'governance',
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
    stop() {
        logger_js_1.default.info(`Stopping governance node ${this.nodeId}`, {
            component: 'governance'
        });
        this.isActive = false;
        this.state.isActive = false;
    }
    async createDailyProposal() {
        logger_js_1.default.info(`GovernanceNode ${this.nodeId} does not create proposals - only votes on them`, {
            component: 'governance',
            note: 'As per d-loop whitepaper: AI Governance Nodes vote, Investment Nodes create proposals'
        });
        return;
    }
    async checkAndVoteOnProposals() {
        if (!this.isActive) {
            logger_js_1.default.warn(`Node ${this.nodeId} is not active, skipping voting`);
            return;
        }
        try {
            logger_js_1.default.info(`Checking and voting on proposals for node ${this.nodeId}`, { component: 'governance' });
            const activeProposals = await this.contractService.getActiveProposals();
            if (!activeProposals || activeProposals.length === 0) {
                logger_js_1.default.info(`No active proposals found for voting`, { nodeId: this.nodeId });
                return;
            }
            logger_js_1.default.info(`Found ${activeProposals.length} active proposals`, {
                nodeId: this.nodeId,
                component: 'governance'
            });
            const marketAnalysis = await this.marketDataService.analyzeMarketData();
            let votesAttempted = 0;
            let votesSuccessful = 0;
            for (let i = 0; i < activeProposals.length; i++) {
                const proposal = activeProposals[i];
                try {
                    if (i > 0) {
                        const delayTime = 800 + (i * 200);
                        logger_js_1.default.debug(`Adding ${delayTime}ms delay before processing proposal ${proposal.id}`, {
                            nodeId: this.nodeId,
                            proposalIndex: i
                        });
                        await this.delay(delayTime);
                    }
                    const hasVoted = await this.contractService.hasVoted(proposal.id, this.nodeIndex);
                    if (hasVoted) {
                        logger_js_1.default.debug(`Already voted on proposal ${proposal.id}`, { nodeId: this.nodeId });
                        continue;
                    }
                    if (proposal.description.toUpperCase().includes('USDC')) {
                        logger_js_1.default.info(`Processing high-priority USDC proposal ${proposal.id}`, {
                            nodeId: this.nodeId,
                            proposalType: proposal.proposalType
                        });
                        await this.delay(200);
                    }
                    const decision = await this.strategy.analyzeProposal(proposal, marketAnalysis, {
                        nodeId: this.nodeId,
                        nodeAddress: this.wallet.address
                    });
                    if (!decision.shouldVote) {
                        logger_js_1.default.info(`Strategy decided not to vote on proposal ${proposal.id}`, {
                            nodeId: this.nodeId,
                            reasoning: decision.reasoning
                        });
                        continue;
                    }
                    await this.delay(1000);
                    votesAttempted++;
                    const txHash = await this.contractService.vote(this.nodeIndex, proposal.id, decision.voteSupport);
                    votesSuccessful++;
                    this.state.votesAcast++;
                    logger_js_1.default.info(`Vote cast successfully`, {
                        nodeId: this.nodeId,
                        proposalId: proposal.id,
                        support: decision.voteSupport,
                        confidence: decision.confidence,
                        reasoning: decision.reasoning,
                        txHash
                    });
                    await this.delay(2000);
                }
                catch (voteError) {
                    const errorMessage = voteError instanceof Error ? voteError.message : String(voteError);
                    logger_js_1.default.error(`Failed to vote on proposal ${proposal.id}`, {
                        nodeId: this.nodeId,
                        error: errorMessage,
                        proposalId: proposal.id
                    });
                    if (errorMessage.includes('Too Many Requests') || errorMessage.includes('rate limit')) {
                        logger_js_1.default.warn(`Rate limited while voting, adding 5 second delay`, { nodeId: this.nodeId });
                        await this.delay(5000);
                    }
                }
            }
            this.state.lastVoteTime = Date.now();
            logger_js_1.default.info(`Voting round completed for ${this.nodeId}`, {
                proposalsProcessed: activeProposals.length,
                votesAttempted,
                votesSuccessful
            });
        }
        catch (error) {
            logger_js_1.default.error(`Failed to check and vote on proposals for node ${this.nodeId}`, {
                component: 'governance',
                error: error instanceof Error ? error.message : String(error)
            });
            throw new index_js_1.GovernanceError(`Voting failed for ${this.nodeId}: ${error instanceof Error ? error.message : String(error)}`, 'VOTING_ERROR');
        }
    }
    async checkBalances() {
        try {
            logger_js_1.default.info(`Checking balances for node ${this.nodeId}`, {
                component: 'governance',
                nodeAddress: this.wallet.address
            });
            await this.delay(Math.random() * 300 + 100);
            const [ethResult, tokenResult] = await Promise.allSettled([
                this.walletService.getBalance(this.nodeIndex),
                this.contractService.getTokenBalance(this.nodeIndex)
            ]);
            let ethBalance = 'Unknown';
            let tokenBalance = 'Unknown';
            if (ethResult.status === 'fulfilled') {
                ethBalance = ethResult.value;
            }
            else {
                logger_js_1.default.warn(`Failed to get ETH balance for node ${this.nodeId}`, {
                    component: 'governance',
                    error: ethResult.reason instanceof Error ? ethResult.reason.message : String(ethResult.reason)
                });
                ethBalance = '0.01';
            }
            if (tokenResult.status === 'fulfilled') {
                tokenBalance = tokenResult.value;
            }
            else {
                logger_js_1.default.warn(`Failed to get DLOOP balance for node ${this.nodeId}`, {
                    component: 'governance',
                    error: tokenResult.reason instanceof Error ? tokenResult.reason.message : String(tokenResult.reason)
                });
                tokenBalance = '1000.0';
            }
            logger_js_1.default.info(`Node balances checked`, {
                component: 'governance',
                address: this.wallet.address,
                ethBalance: `${ethBalance} ETH`,
                tokenBalance: `${tokenBalance} DLOOP`
            });
            if (ethResult.status === 'fulfilled' && parseFloat(ethBalance) < 0.01) {
                logger_js_1.default.warn(`Low ETH balance for node ${this.nodeId}: ${ethBalance} ETH`, {
                    component: 'governance'
                });
            }
            if (tokenResult.status === 'fulfilled' && parseFloat(tokenBalance) < 100) {
                logger_js_1.default.warn(`Low DLOOP balance for node ${this.nodeId}: ${tokenBalance} DLOOP`, {
                    component: 'governance'
                });
            }
        }
        catch (error) {
            logger_js_1.default.warn(`Balance check had issues for node ${this.nodeId}, continuing with startup`, {
                component: 'governance',
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    getStatus() {
        return {
            nodeId: this.nodeId,
            address: this.wallet.address,
            strategy: this.strategy.getStrategyName(),
            isActive: this.isActive,
            stats: {
                proposalsCreated: this.state.proposalsCreated,
                votesAcast: this.state.votesAcast,
                lastProposalTime: this.state.lastProposalTime,
                lastVoteTime: this.state.lastVoteTime,
                uptime: this.isActive ? Date.now() - this.state.lastProposalTime : 0
            }
        };
    }
    getState() {
        return { ...this.state };
    }
    getNodeId() {
        return this.nodeId;
    }
    isNodeActive() {
        return this.isActive;
    }
}
exports.GovernanceNode = GovernanceNode;
//# sourceMappingURL=GovernanceNode.js.map