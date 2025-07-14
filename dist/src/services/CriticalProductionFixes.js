"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CriticalProductionFixes = void 0;
class CriticalProductionFixes {
    constructor(contractService, walletService) {
        this.MAX_PROCESSING_TIME = 60000;
        this.MAX_PROPOSALS_PER_BATCH = 5;
        this.MINIMUM_DELAY_BETWEEN_OPERATIONS = 1000;
        this.RPC_TIMEOUT = 5000;
        this.EMERGENCY_BRAKE_TIME = 45000;
        this.contractService = contractService;
        this.walletService = walletService;
    }
    async executeEmergencyVotingRound() {
        const startTime = Date.now();
        console.log('🚨 EMERGENCY VOTING ROUND - Critical fixes active');
        try {
            console.log('📊 Fetching proposals with emergency timeout...');
            const proposals = await this.getProposalsWithEmergencyTimeout();
            if (proposals.length === 0) {
                console.log('ℹ️  No active proposals found');
                return;
            }
            console.log(`✅ Found ${proposals.length} active proposals`);
            const criticalProposals = this.prioritizeProposals(proposals);
            const limitedProposals = criticalProposals.slice(0, this.MAX_PROPOSALS_PER_BATCH);
            console.log(`🎯 Processing ${limitedProposals.length} priority proposals`);
            await this.executeVotingWithTimeGuards(limitedProposals, startTime);
            const totalTime = Date.now() - startTime;
            console.log(`✅ Emergency voting round completed in ${totalTime}ms`);
        }
        catch (error) {
            const totalTime = Date.now() - startTime;
            console.error(`❌ Emergency voting round failed after ${totalTime}ms:`, error);
            console.log('🔄 System will continue with next scheduled attempt');
        }
    }
    async getProposalsWithEmergencyTimeout() {
        return new Promise(async (resolve, reject) => {
            const timeoutId = setTimeout(() => {
                console.log('⏰ EMERGENCY TIMEOUT: Proposal fetching stopped');
                resolve([]);
            }, this.RPC_TIMEOUT);
            try {
                console.log('🔍 Attempting to fetch proposals...');
                const proposals = await this.contractService.getProposals();
                clearTimeout(timeoutId);
                console.log(`📋 Successfully fetched ${proposals.length} proposals`);
                resolve(proposals);
            }
            catch (error) {
                clearTimeout(timeoutId);
                console.error('❌ Proposal fetching failed:', error);
                resolve([]);
            }
        });
    }
    prioritizeProposals(proposals) {
        const usdcProposals = proposals.filter(p => p.assetAddress.toLowerCase().includes('1c7d4b196cb0c7b01d743fbc6116a902379c7238'));
        const highValueProposals = proposals.filter(p => !p.assetAddress.toLowerCase().includes('1c7d4b196cb0c7b01d743fbc6116a902379c7238') &&
            parseFloat(p.amount) > 1000);
        const otherProposals = proposals.filter(p => !p.assetAddress.toLowerCase().includes('1c7d4b196cb0c7b01d743fbc6116a902379c7238') &&
            parseFloat(p.amount) <= 1000);
        console.log(`📊 Proposal prioritization: USDC(${usdcProposals.length}) + High-value(${highValueProposals.length}) + Other(${otherProposals.length})`);
        return [...usdcProposals, ...highValueProposals, ...otherProposals];
    }
    async executeVotingWithTimeGuards(proposals, startTime) {
        let processedCount = 0;
        let votedCount = 0;
        for (const proposal of proposals) {
            const elapsedTime = Date.now() - startTime;
            if (elapsedTime > this.EMERGENCY_BRAKE_TIME) {
                console.log(`🚨 EMERGENCY BRAKE: Stopping after ${elapsedTime}ms (processed ${processedCount}/${proposals.length})`);
                break;
            }
            try {
                console.log(`🔍 Processing proposal ${proposal.id} (${processedCount + 1}/${proposals.length})`);
                const voted = await this.processProposalWithGuards(proposal);
                if (voted) {
                    votedCount++;
                    console.log(`✅ Voted on proposal ${proposal.id}`);
                }
                else {
                    console.log(`⏭️  Skipped proposal ${proposal.id}`);
                }
                processedCount++;
                if (processedCount < proposals.length) {
                    await this.delay(this.MINIMUM_DELAY_BETWEEN_OPERATIONS);
                }
            }
            catch (error) {
                console.error(`❌ Failed to process proposal ${proposal.id}:`, error);
                processedCount++;
                continue;
            }
        }
        console.log(`📊 Voting summary: ${votedCount} votes cast, ${processedCount} proposals processed`);
    }
    async processProposalWithGuards(proposal) {
        return new Promise(async (resolve) => {
            const timeoutId = setTimeout(() => {
                console.log(`⏰ Proposal ${proposal.id} processing timeout`);
                resolve(false);
            }, 8000);
            try {
                const shouldVote = this.makeQuickVotingDecision(proposal);
                if (!shouldVote.vote) {
                    clearTimeout(timeoutId);
                    resolve(false);
                    return;
                }
                const hasVoted = await this.checkVoteStatusWithTimeout(proposal.id);
                if (hasVoted) {
                    clearTimeout(timeoutId);
                    console.log(`ℹ️  Already voted on proposal ${proposal.id}`);
                    resolve(false);
                    return;
                }
                await this.castVoteWithTimeout(proposal.id, shouldVote.support);
                clearTimeout(timeoutId);
                resolve(true);
            }
            catch (error) {
                clearTimeout(timeoutId);
                console.error(`❌ Error in proposal ${proposal.id} processing:`, error);
                resolve(false);
            }
        });
    }
    makeQuickVotingDecision(proposal) {
        const isUSDC = proposal.assetAddress.toLowerCase().includes('1c7d4b196cb0c7b01d743fbc6116a902379c7238');
        const amount = parseFloat(proposal.amount);
        if (isUSDC && amount <= 10000) {
            return { vote: true, support: true };
        }
        return { vote: false, support: false };
    }
    async checkVoteStatusWithTimeout(proposalId) {
        return new Promise(async (resolve) => {
            const timeoutId = setTimeout(() => {
                console.log(`⏰ Vote status check timeout for proposal ${proposalId}`);
                resolve(false);
            }, 3000);
            try {
                const hasVoted = await this.contractService.hasVoted(proposalId, 0);
                clearTimeout(timeoutId);
                resolve(hasVoted);
            }
            catch (error) {
                clearTimeout(timeoutId);
                console.error(`❌ Vote status check failed for ${proposalId}:`, error);
                resolve(false);
            }
        });
    }
    async castVoteWithTimeout(proposalId, support) {
        return new Promise(async (resolve, reject) => {
            const timeoutId = setTimeout(() => {
                console.log(`⏰ Vote casting timeout for proposal ${proposalId}`);
                reject(new Error('Vote casting timeout'));
            }, 10000);
            try {
                const txHash = await this.contractService.vote(0, proposalId, support);
                clearTimeout(timeoutId);
                console.log(`🗳️  Vote cast: ${txHash}`);
                resolve();
            }
            catch (error) {
                clearTimeout(timeoutId);
                reject(error);
            }
        });
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    async performEmergencyHealthCheck() {
        try {
            console.log('🏥 Emergency health check...');
            const startTime = Date.now();
            const proposals = await this.contractService.getProposals();
            const responseTime = Date.now() - startTime;
            console.log(`✅ Health check passed (${responseTime}ms, ${proposals.length} proposals)`);
            return responseTime < 5000;
        }
        catch (error) {
            console.error('❌ Health check failed:', error);
            return false;
        }
    }
}
exports.CriticalProductionFixes = CriticalProductionFixes;
exports.default = CriticalProductionFixes;
//# sourceMappingURL=CriticalProductionFixes.js.map