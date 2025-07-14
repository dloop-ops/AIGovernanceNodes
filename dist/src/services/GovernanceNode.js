"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GovernanceNode = void 0;
const ethers_1 = require("ethers");
const ContractService_1 = require("./ContractService");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
console.log('🚀 [ENHANCED] Loading GovernanceNode with AI-powered optimizations...');
class GovernanceNode {
    constructor(config, wallet, walletService) {
        this.isActive = false;
        this.lastProposalTime = 0;
        this.lastVoteTime = 0;
        this.proposalsCreated = 0;
        this.votesAcast = 0;
        this.nodeId = config.id;
        this.wallet = wallet;
        this.strategy = config.strategy;
        this.walletIndex = config.walletIndex;
        this.contractService = new ContractService_1.ContractService(walletService);
        console.log(`🔄 GovernanceNode ${this.nodeId} initialized with ${this.strategy} strategy`);
    }
    getNodeId() {
        return this.nodeId;
    }
    isNodeActive() {
        return this.isActive;
    }
    getStatus() {
        return {
            nodeId: this.nodeId,
            wallet: this.wallet,
            strategy: this.strategy,
            isActive: this.isActive,
            lastProposalTime: this.lastProposalTime,
            lastVoteTime: this.lastVoteTime,
            proposalsCreated: this.proposalsCreated,
            votesAcast: this.votesAcast
        };
    }
    async start() {
        this.isActive = true;
        console.log(`✅ GovernanceNode ${this.nodeId} started successfully`);
        await Promise.resolve();
    }
    async stop() {
        this.isActive = false;
        console.log(`🛑 GovernanceNode ${this.nodeId} stopped`);
        await Promise.resolve();
    }
    async processActiveProposals() {
        const startTime = Date.now();
        console.log('🗳️  Starting optimized proposal processing...');
        try {
            const proposals = await this.getActiveProposalsDirectly();
            if (!proposals || proposals.length === 0) {
                console.log('📊 No active proposals found');
                return;
            }
            console.log(`📊 Found ${proposals.length} active proposals to process`);
            const usdcProposals = proposals.filter((proposal) => proposal.assetAddress === '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' ||
                proposal.description.toLowerCase().includes('usdc'));
            const otherProposals = proposals.filter((proposal) => proposal.assetAddress !== '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' &&
                !proposal.description.toLowerCase().includes('usdc'));
            console.log(`💰 Processing ${usdcProposals.length} USDC proposals (priority)`);
            console.log(`📋 Processing ${otherProposals.length} other proposals`);
            await this.processProposalBatch(usdcProposals, 'USDC Priority', 1000, 3000);
            const elapsedTime = Date.now() - startTime;
            const remainingTime = 90000 - elapsedTime;
            if (remainingTime > 10000 && otherProposals.length > 0) {
                console.log(`⏱️  ${remainingTime}ms remaining, processing ${otherProposals.length} other proposals`);
                await this.processProposalBatch(otherProposals.slice(0, 10), 'Other', 800, 2000);
            }
            else {
                console.log(`⏱️  Insufficient time (${remainingTime}ms) for other proposals`);
            }
            const totalTime = Date.now() - startTime;
            console.log(`✅ Proposal processing completed in ${totalTime}ms`);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('❌ Error in processActiveProposals:', errorMessage);
        }
    }
    async processProposalBatch(proposals, batchName, baseDelay, maxTime) {
        const batchStartTime = Date.now();
        let processed = 0;
        console.log(`🔄 Starting ${batchName} batch: ${proposals.length} proposals`);
        for (const proposal of proposals) {
            try {
                const batchElapsed = Date.now() - batchStartTime;
                if (batchElapsed > maxTime) {
                    console.log(`⏱️  Batch time limit reached (${batchElapsed}ms), stopping`);
                    break;
                }
                const dynamicDelay = baseDelay + (processed * 200);
                if (processed > 0) {
                    console.log(`⏳ Waiting ${dynamicDelay}ms before next proposal...`);
                    await this.delay(dynamicDelay);
                }
                console.log(`🗳️  Processing proposal ${proposal.id} (${processed + 1}/${proposals.length})`);
                await Promise.race([
                    this.processProposalWithTimeout(proposal),
                    new Promise((_, reject) => setTimeout(() => reject(new Error(`Proposal ${proposal.id} processing timeout`)), 8000))
                ]);
                processed++;
                if (processed % 3 === 0) {
                    console.log('⏳ Extra cooling period after 3 proposals...');
                    await this.delay(2000);
                }
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                console.error(`❌ Failed to process proposal ${proposal.id}:`, errorMessage);
                processed++;
            }
        }
        const batchTime = Date.now() - batchStartTime;
        console.log(`✅ ${batchName} batch completed: ${processed}/${proposals.length} in ${batchTime}ms`);
    }
    async processProposalWithTimeout(proposal) {
        try {
            console.log(`🔍 Analyzing proposal ${proposal.id}: ${proposal.description.substring(0, 50)}...`);
            if (!this.isValidProposal(proposal)) {
                console.log(`⚠️  Proposal ${proposal.id} failed validation, skipping`);
                return;
            }
            const hasVoted = await Promise.race([
                this.hasAlreadyVoted(proposal.id),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Vote check timeout')), 3000))
            ]);
            if (hasVoted) {
                console.log(`✅ Already voted on proposal ${proposal.id}`);
                return;
            }
            const decision = await this.makeVotingDecision(proposal);
            if (decision.shouldVote) {
                console.log(`🗳️  Voting ${decision.voteFor ? 'FOR' : 'AGAINST'} proposal ${proposal.id}`);
                await this.delay(1000);
                await Promise.race([
                    this.castVote(proposal.id, decision.voteFor, decision.reason),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Vote transaction timeout')), 15000))
                ]);
                await this.delay(2000);
            }
            else {
                console.log(`❌ Decided not to vote on proposal ${proposal.id}: ${decision.reason}`);
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(`❌ Error processing proposal ${proposal.id}:`, errorMessage);
            throw error;
        }
    }
    async hasAlreadyVoted(proposalId) {
        try {
            return await this.contractService.hasVoted(proposalId, this.walletIndex);
        }
        catch (error) {
            logger_js_1.default.error(`Error checking vote status for proposal ${proposalId}`, { error });
            return false;
        }
    }
    async makeVotingDecision(proposal) {
        try {
            await Promise.resolve();
            if (proposal.assetAddress === '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' &&
                proposal.description.toLowerCase().includes('invest')) {
                return {
                    shouldVote: true,
                    voteFor: true,
                    reason: 'USDC investment aligns with stable asset strategy'
                };
            }
            return {
                shouldVote: false,
                voteFor: false,
                reason: 'Conservative strategy - abstaining from non-USDC proposals'
            };
        }
        catch (error) {
            logger_js_1.default.error('Error making voting decision', { error });
            return {
                shouldVote: false,
                voteFor: false,
                reason: 'Error in decision making process'
            };
        }
    }
    async castVote(proposalId, voteFor, reason) {
        try {
            await this.contractService.vote(this.walletIndex, proposalId, voteFor);
            this.votesAcast++;
            this.lastVoteTime = Date.now();
            logger_js_1.default.info(`Vote cast successfully on proposal ${proposalId}`, {
                voteFor,
                reason,
                nodeId: this.nodeId
            });
        }
        catch (error) {
            logger_js_1.default.error(`Failed to cast vote on proposal ${proposalId}`, { error });
            throw error;
        }
    }
    isValidProposal(proposal) {
        try {
            if (!proposal.id || !proposal.proposer) {
                console.log(`❌ Proposal ${proposal.id} missing required fields`);
                return false;
            }
            if (typeof proposal.state === 'undefined' || proposal.state === null) {
                console.log(`❌ Proposal ${proposal.id} has undefined state`);
                return false;
            }
            if (proposal.state !== 1) {
                console.log(`❌ Proposal ${proposal.id} is not active (state: ${proposal.state})`);
                return false;
            }
            const now = Math.floor(Date.now() / 1000);
            if (proposal.endTime && proposal.endTime < now) {
                console.log(`❌ Proposal ${proposal.id} has expired`);
                return false;
            }
            return true;
        }
        catch (error) {
            console.error('❌ Error validating proposal:', error instanceof Error ? error.message : 'Unknown error');
            return false;
        }
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    async getActiveProposalsDirectly() {
        try {
            const provider = this.contractService.getProvider();
            const assetDaoAddress = '0xa87e662061237a121Ca2E83E77dA8251bc4B3529';
            const assetDaoABI = [
                "function getProposalCount() external view returns (uint256)",
                "function getProposal(uint256) external view returns (uint256, uint8, address, uint256, string, address, uint256, uint256, uint256, uint256, uint8, bool)"
            ];
            const contract = new ethers_1.ethers.Contract(assetDaoAddress, assetDaoABI, provider);
            const totalCount = await contract.getProposalCount();
            const startFrom = Math.max(1, Number(totalCount) - 19);
            console.log(`📊 Checking proposals ${startFrom} to ${totalCount} for active ones...`);
            const activeProposals = [];
            const currentTime = Math.floor(Date.now() / 1000);
            for (let i = startFrom; i <= Number(totalCount); i++) {
                try {
                    const proposalData = await contract.getProposal(i);
                    const proposalState = Number(proposalData[10]);
                    const votingEnds = Number(proposalData[7]);
                    if (proposalState === 1) {
                        const timeLeft = votingEnds - currentTime;
                        if (timeLeft > 0) {
                            activeProposals.push({
                                id: i.toString(),
                                proposer: proposalData[2],
                                proposalType: proposalData[1].toString(),
                                state: Number(proposalData[10]),
                                assetAddress: proposalData[5],
                                amount: proposalData[3],
                                description: proposalData[4] || `Proposal ${i}`,
                                votesFor: proposalData[8],
                                votesAgainst: proposalData[9],
                                startTime: Number(proposalData[6]),
                                endTime: Number(proposalData[7]),
                                executed: false,
                                cancelled: false,
                                title: `Proposal ${i}`,
                                asset: 'USDC',
                                status: 'ACTIVE',
                                totalSupply: 1000000,
                                quorumReached: false
                            });
                            const hoursLeft = Math.floor(timeLeft / 3600);
                            console.log(`   ✅ Found ACTIVE proposal ${i} (${hoursLeft}h remaining)`);
                        }
                    }
                }
                catch (error) {
                    console.log(`   ❌ Error checking proposal ${i}:`, error);
                }
            }
            console.log(`📋 Found ${activeProposals.length} active proposals using diagnostic logic`);
            return activeProposals;
        }
        catch (error) {
            console.error('❌ Failed to fetch proposals directly:', error);
            return [];
        }
    }
    async processVotingRound() {
        const result = {
            success: true,
            votesSubmitted: 0,
            skipped: 0,
            errors: 0
        };
        try {
            return result;
        }
        catch (error) {
            result.success = false;
            result.errors = 1;
            return result;
        }
    }
}
exports.GovernanceNode = GovernanceNode;
//# sourceMappingURL=GovernanceNode.js.map