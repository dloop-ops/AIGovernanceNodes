import { ContractService } from './ContractService.js';
import { ProposalState } from '../types/index.js';
import { MarketDataService } from './MarketDataService.js';
import logger from '../utils/logger.js';
console.log('🚀 [ENHANCED] Loading GovernanceNode with AI-powered optimizations...');
export class GovernanceNode {
    nodeId;
    wallet;
    contractService;
    marketDataService;
    strategy;
    isActive = false;
    lastProposalTime = 0;
    lastVoteTime = 0;
    proposalsCreated = 0;
    votesAcast = 0;
    walletIndex;
    constructor(config, wallet, walletService) {
        this.nodeId = config.id;
        this.wallet = wallet;
        this.strategy = config.strategy;
        this.walletIndex = config.walletIndex;
        this.contractService = new ContractService(walletService);
        this.marketDataService = new MarketDataService();
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
            // Get active proposals with timeout protection
            const proposals = await Promise.race([
                this.contractService.getProposals(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Proposal fetching timeout')), 30000))
            ]);
            if (!proposals || proposals.length === 0) {
                console.log('📊 No active proposals found');
                return;
            }
            console.log(`📊 Found ${proposals.length} active proposals to process`);
            // Filter for USDC proposals first (highest priority)
            const usdcProposals = proposals.filter((proposal) => proposal.assetAddress === '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' ||
                proposal.description.toLowerCase().includes('usdc'));
            const otherProposals = proposals.filter((proposal) => proposal.assetAddress !== '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' &&
                !proposal.description.toLowerCase().includes('usdc'));
            console.log(`💰 Processing ${usdcProposals.length} USDC proposals (priority)`);
            console.log(`📋 Processing ${otherProposals.length} other proposals`);
            // Process USDC proposals first with extra time allocation
            await this.processProposalBatch(usdcProposals, 'USDC Priority', 1000, 3000);
            // Process remaining proposals if time permits
            const elapsedTime = Date.now() - startTime;
            const remainingTime = 90000 - elapsedTime; // 90 second total limit
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
            // Don't throw - let cron job continue
        }
    }
    async processProposalBatch(proposals, batchName, baseDelay, maxTime) {
        const batchStartTime = Date.now();
        let processed = 0;
        console.log(`🔄 Starting ${batchName} batch: ${proposals.length} proposals`);
        for (const proposal of proposals) {
            try {
                // Check time limit for this batch
                const batchElapsed = Date.now() - batchStartTime;
                if (batchElapsed > maxTime) {
                    console.log(`⏱️  Batch time limit reached (${batchElapsed}ms), stopping`);
                    break;
                }
                // Progressive delay based on proposal number and type
                const dynamicDelay = baseDelay + (processed * 200);
                if (processed > 0) {
                    console.log(`⏳ Waiting ${dynamicDelay}ms before next proposal...`);
                    await this.delay(dynamicDelay);
                }
                console.log(`🗳️  Processing proposal ${proposal.id} (${processed + 1}/${proposals.length})`);
                // Process with individual timeout
                await Promise.race([
                    this.processProposalWithTimeout(proposal),
                    new Promise((_, reject) => setTimeout(() => reject(new Error(`Proposal ${proposal.id} processing timeout`)), 8000))
                ]);
                processed++;
                // Add extra delay after voting transactions
                if (processed % 3 === 0) {
                    console.log('⏳ Extra cooling period after 3 proposals...');
                    await this.delay(2000);
                }
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                console.error(`❌ Failed to process proposal ${proposal.id}:`, errorMessage);
                // Continue with next proposal
                processed++;
            }
        }
        const batchTime = Date.now() - batchStartTime;
        console.log(`✅ ${batchName} batch completed: ${processed}/${proposals.length} in ${batchTime}ms`);
    }
    async processProposalWithTimeout(proposal) {
        try {
            console.log(`🔍 Analyzing proposal ${proposal.id}: ${proposal.description.substring(0, 50)}...`);
            // Quick validation first
            if (!this.isValidProposal(proposal)) {
                console.log(`⚠️  Proposal ${proposal.id} failed validation, skipping`);
                return;
            }
            // Check if already voted (with timeout)
            const hasVoted = await Promise.race([
                this.hasAlreadyVoted(proposal.id),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Vote check timeout')), 3000))
            ]);
            if (hasVoted) {
                console.log(`✅ Already voted on proposal ${proposal.id}`);
                return;
            }
            // Make voting decision
            const decision = await this.makeVotingDecision(proposal);
            if (decision.shouldVote) {
                console.log(`🗳️  Voting ${decision.voteFor ? 'FOR' : 'AGAINST'} proposal ${proposal.id}`);
                // Add delay before voting transaction
                await this.delay(1000);
                // Execute vote with timeout protection
                await Promise.race([
                    this.castVote(proposal.id, decision.voteFor, decision.reason),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Vote transaction timeout')), 15000))
                ]);
                // Add delay after voting transaction
                await this.delay(2000);
            }
            else {
                console.log(`❌ Decided not to vote on proposal ${proposal.id}: ${decision.reason}`);
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(`❌ Error processing proposal ${proposal.id}:`, errorMessage);
            throw error; // Re-throw to be caught by batch processor
        }
    }
    async hasAlreadyVoted(proposalId) {
        try {
            return await this.contractService.hasVoted(proposalId, this.walletIndex);
        }
        catch (error) {
            logger.error(`Error checking vote status for proposal ${proposalId}`, { error });
            return false;
        }
    }
    async makeVotingDecision(proposal) {
        try {
            // Add a small delay to make this properly async and prevent blocking
            await Promise.resolve();
            // Simple strategy for now - vote FOR USDC investment proposals
            if (proposal.assetAddress === '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' &&
                proposal.description.toLowerCase().includes('invest')) {
                return {
                    shouldVote: true,
                    voteFor: true,
                    reason: 'USDC investment aligns with stable asset strategy'
                };
            }
            // Conservative approach for other proposals
            return {
                shouldVote: false,
                voteFor: false,
                reason: 'Conservative strategy - abstaining from non-USDC proposals'
            };
        }
        catch (error) {
            logger.error('Error making voting decision', { error });
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
            logger.info(`Vote cast successfully on proposal ${proposalId}`, {
                voteFor,
                reason,
                nodeId: this.nodeId
            });
        }
        catch (error) {
            logger.error(`Failed to cast vote on proposal ${proposalId}`, { error });
            throw error;
        }
    }
    isValidProposal(proposal) {
        try {
            // Basic validation checks
            if (!proposal.id || !proposal.proposer) {
                return false;
            }
            // Check if proposal is still active
            if (proposal.state !== ProposalState.ACTIVE) {
                return false;
            }
            // Check if proposal hasn't expired
            const now = Math.floor(Date.now() / 1000);
            if (proposal.endTime && proposal.endTime < now) {
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
}
//# sourceMappingURL=GovernanceNode.js.map