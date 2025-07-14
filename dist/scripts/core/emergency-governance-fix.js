#!/usr/bin/env ts-node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmergencyGovernanceFix = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const ethers_1 = require("ethers");
const ContractService_1 = require("../../src/services/ContractService");
const WalletService_1 = require("../../src/services/WalletService");
dotenv_1.default.config();
class EmergencyGovernanceFix {
    constructor() {
        this.EMERGENCY_TIMEOUT = 60000;
        this.MAX_PROPOSALS_EMERGENCY = 10;
        this.RPC_EMERGENCY_TIMEOUT = 30000;
        this.OPERATION_DELAY = 2000;
        console.log('🚨 INITIALIZING EMERGENCY GOVERNANCE FIX');
        console.log('========================================');
        this.initializeServices();
    }
    initializeServices() {
        try {
            this.walletService = new WalletService_1.WalletService();
            console.log('✅ WalletService initialized');
            this.contractService = new ContractService_1.ContractService(this.walletService);
            console.log('✅ ContractService initialized');
        }
        catch (error) {
            console.error('❌ Failed to initialize services:', error);
            throw new Error('Service initialization failed');
        }
    }
    async executeEmergencyIntervention() {
        const startTime = Date.now();
        try {
            console.log('🚨 STARTING EMERGENCY GOVERNANCE INTERVENTION');
            console.log('===========================================');
            console.log(`⏰ Start time: ${new Date().toISOString()}`);
            console.log(`🎯 Emergency limits: ${this.MAX_PROPOSALS_EMERGENCY} proposals, ${this.EMERGENCY_TIMEOUT}ms timeout`);
            console.log('\n🏥 STEP 1: Emergency Health Check');
            const isHealthy = await this.emergencyHealthCheck();
            if (!isHealthy) {
                throw new Error('🚨 CRITICAL: System health check failed - aborting intervention');
            }
            console.log('\n📊 STEP 2: Fetching Active Proposals');
            const proposals = await this.getActiveProposalsEmergency();
            if (proposals.length === 0) {
                console.log('ℹ️  No active proposals found - intervention complete');
                return;
            }
            console.log('\n🗳️  STEP 3: Emergency Voting Process');
            await this.processEmergencyVoting(proposals, startTime);
            const totalTime = Date.now() - startTime;
            console.log('\n✅ EMERGENCY GOVERNANCE INTERVENTION COMPLETED');
            console.log('===========================================');
            console.log(`⏱️  Total execution time: ${totalTime}ms`);
            console.log(`🎯 Completed at: ${new Date().toISOString()}`);
        }
        catch (error) {
            const totalTime = Date.now() - startTime;
            console.error('\n❌ EMERGENCY GOVERNANCE INTERVENTION FAILED');
            console.error('=========================================');
            console.error(`⏱️  Failed after: ${totalTime}ms`);
            console.error(`🚨 Error: ${error instanceof Error ? error.message : String(error)}`);
            console.log('🔄 System will attempt recovery on next run');
        }
    }
    async emergencyHealthCheck() {
        return new Promise(async (resolve) => {
            console.log('🔍 Testing basic connectivity...');
            const timeoutId = setTimeout(() => {
                console.log('⏰ Health check timeout - assuming unhealthy');
                resolve(false);
            }, this.RPC_EMERGENCY_TIMEOUT);
            try {
                const provider = this.walletService.getProvider();
                const assetDao = new ethers_1.ethers.Contract(process.env.ASSET_DAO_CONTRACT_ADDRESS, ["function getProposalCount() view returns (uint256)"], provider);
                const count = await assetDao.getProposalCount();
                clearTimeout(timeoutId);
                console.log(`✅ Health check passed - found ${count.toString()} total proposals`);
                resolve(true);
            }
            catch (error) {
                clearTimeout(timeoutId);
                console.error('❌ Health check failed:', error);
                resolve(false);
            }
        });
    }
    async getActiveProposalsEmergency() {
        return new Promise(async (resolve) => {
            console.log('📋 Fetching active proposals with emergency timeout...');
            const timeoutId = setTimeout(() => {
                console.log('⏰ Proposal fetching timeout - returning empty array');
                resolve([]);
            }, this.RPC_EMERGENCY_TIMEOUT);
            try {
                const provider = this.walletService.getProvider();
                const assetDao = new ethers_1.ethers.Contract(process.env.ASSET_DAO_CONTRACT_ADDRESS, [
                    "function getProposalCount() view returns (uint256)",
                    "function getProposal(uint256) view returns (uint256, uint8, address, uint256, string, address, uint256, uint256, uint256, uint256, uint8, bool)"
                ], provider);
                const count = await assetDao.getProposalCount();
                const totalCount = Number(count);
                const startFrom = Math.max(1, totalCount - 19);
                const maxToCheck = totalCount;
                console.log(`📊 Checking proposals ${startFrom}-${maxToCheck} (last 20 of ${totalCount}) for active ones...`);
                const activeProposals = [];
                for (let i = startFrom; i <= maxToCheck; i++) {
                    try {
                        const proposalData = await assetDao.getProposal(i);
                        const proposalState = Number(proposalData[10]);
                        if (Number(proposalState) === 1) {
                            const currentTime = Math.floor(Date.now() / 1000);
                            const votingEnds = Number(proposalData[7]);
                            const timeLeft = votingEnds - currentTime;
                            if (timeLeft > 0) {
                                activeProposals.push({
                                    id: i.toString(),
                                    proposer: proposalData[2],
                                    proposalType: proposalData[1].toString(),
                                    assetAddress: proposalData[5],
                                    amount: ethers_1.ethers.formatEther(proposalData[3]),
                                    description: proposalData[4] || `Emergency Proposal ${i}`,
                                    state: Number(proposalData[10]),
                                    votesFor: ethers_1.ethers.formatEther(proposalData[8]),
                                    votesAgainst: ethers_1.ethers.formatEther(proposalData[9]),
                                    startTime: Number(proposalData[6]),
                                    endTime: Number(proposalData[7]),
                                    executed: proposalData[11],
                                    cancelled: false,
                                    title: `Emergency Proposal ${i}`,
                                    asset: 'USDC',
                                    status: 'ACTIVE',
                                    totalSupply: 1000000,
                                    quorumReached: false
                                });
                                console.log(`   ✅ Found VALID active proposal ${i} (${Math.floor(timeLeft / 3600)}h left)`);
                            }
                            else {
                                console.log(`   ⏰ Skipped proposal ${i} - voting period expired ${Math.abs(timeLeft)}s ago`);
                            }
                        }
                    }
                    catch (error) {
                        console.log(`   ⚠️  Skipped proposal ${i}: ${error?.message?.slice(0, 100) || error}...`);
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        continue;
                    }
                    if (i < maxToCheck) {
                        await new Promise(resolve => setTimeout(resolve, 200));
                    }
                }
                clearTimeout(timeoutId);
                console.log(`📊 Found ${activeProposals.length} active proposals in first ${maxToCheck}`);
                resolve(activeProposals);
            }
            catch (error) {
                clearTimeout(timeoutId);
                console.error('❌ Failed to fetch proposals:', error);
                resolve([]);
            }
        });
    }
    async processEmergencyVoting(proposals, startTime) {
        console.log(`🎯 Processing up to ${this.MAX_PROPOSALS_EMERGENCY} priority proposals...`);
        const usdcProposals = proposals.filter(p => p.assetAddress.toLowerCase().includes('1c7d4b196cb0c7b01d743fbc6116a902379c7238'));
        const highValueProposals = proposals.filter(p => !p.assetAddress.toLowerCase().includes('1c7d4b196cb0c7b01d743fbc6116a902379c7238') &&
            parseFloat(p.amount) > 1000);
        console.log(`📊 Priority breakdown: USDC(${usdcProposals.length}) + High-value(${highValueProposals.length})`);
        const priorityProposals = [...usdcProposals, ...highValueProposals]
            .slice(0, this.MAX_PROPOSALS_EMERGENCY);
        console.log(`🎯 Selected ${priorityProposals.length} proposals for emergency processing`);
        let processedCount = 0;
        let votedCount = 0;
        for (const proposal of priorityProposals) {
            const elapsedTime = Date.now() - startTime;
            if (elapsedTime > this.EMERGENCY_TIMEOUT) {
                console.log(`🚨 EMERGENCY BRAKE: Stopping after ${elapsedTime}ms`);
                break;
            }
            try {
                console.log(`\n🔍 Processing proposal ${proposal.id} (${processedCount + 1}/${priorityProposals.length})`);
                console.log(`   💰 Amount: ${proposal.amount}`);
                console.log(`   📍 Asset: ${proposal.assetAddress.slice(0, 10)}...`);
                const voted = await this.processProposalEmergency(proposal);
                if (voted) {
                    votedCount++;
                    console.log(`   ✅ Vote cast successfully`);
                }
                else {
                    console.log(`   ⏭️  Skipped (already voted or error)`);
                }
                processedCount++;
                if (processedCount < priorityProposals.length) {
                    console.log(`   ⏱️  Waiting ${this.OPERATION_DELAY}ms before next operation...`);
                    await this.delay(this.OPERATION_DELAY);
                }
            }
            catch (error) {
                console.error(`   ❌ Failed to process proposal ${proposal.id}:`, error);
                processedCount++;
                continue;
            }
        }
        console.log(`\n📊 EMERGENCY VOTING SUMMARY`);
        console.log(`   📝 Processed: ${processedCount} proposals`);
        console.log(`   🗳️  Voted: ${votedCount} times`);
        console.log(`   ⏱️  Time: ${Date.now() - startTime}ms`);
    }
    async processProposalEmergency(proposal) {
        return new Promise(async (resolve) => {
            const timeoutId = setTimeout(() => {
                console.log(`   ⏰ Proposal ${proposal.id} processing timeout`);
                resolve(false);
            }, 15000);
            try {
                const shouldVote = this.makeEmergencyVotingDecision(proposal);
                if (!shouldVote.vote) {
                    clearTimeout(timeoutId);
                    resolve(false);
                    return;
                }
                const hasVoted = await this.checkVoteStatusEmergency(proposal.id);
                if (hasVoted) {
                    clearTimeout(timeoutId);
                    console.log(`   ℹ️  Already voted on proposal ${proposal.id}`);
                    resolve(false);
                    return;
                }
                await this.castVoteEmergency(proposal.id, shouldVote.support);
                clearTimeout(timeoutId);
                resolve(true);
            }
            catch (error) {
                clearTimeout(timeoutId);
                console.error(`   ❌ Error processing proposal ${proposal.id}:`, error);
                resolve(false);
            }
        });
    }
    makeEmergencyVotingDecision(proposal) {
        const isUSDC = proposal.assetAddress.toLowerCase().includes('1c7d4b196cb0c7b01d743fbc6116a902379c7238');
        const amount = parseFloat(proposal.amount);
        if (isUSDC && amount <= 5000) {
            console.log(`   🎯 USDC proposal ${proposal.id} under $5,000 - voting YES`);
            return { vote: true, support: true };
        }
        console.log(`   ⏭️  Skipping proposal ${proposal.id} (not priority or too large)`);
        return { vote: false, support: false };
    }
    async checkVoteStatusEmergency(proposalId) {
        return new Promise(async (resolve) => {
            const timeoutId = setTimeout(() => {
                console.log(`   ⏰ Vote status timeout for ${proposalId}`);
                resolve(false);
            }, 2000);
            try {
                const hasVoted = await this.contractService.hasVoted(proposalId, 0);
                clearTimeout(timeoutId);
                resolve(hasVoted);
            }
            catch (error) {
                clearTimeout(timeoutId);
                console.error(`   ❌ Vote status check failed:`, error);
                resolve(false);
            }
        });
    }
    async castVoteEmergency(proposalId, support) {
        return new Promise(async (resolve, reject) => {
            const timeoutId = setTimeout(() => {
                console.log(`   ⏰ Vote casting timeout for ${proposalId}`);
                reject(new Error('Vote casting timeout'));
            }, 30000);
            try {
                const txHash = await this.contractService.vote(0, proposalId, support);
                clearTimeout(timeoutId);
                console.log(`   🗳️  Vote cast: ${txHash.slice(0, 10)}...`);
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
}
exports.EmergencyGovernanceFix = EmergencyGovernanceFix;
async function main() {
    try {
        console.log('🚨 DLoop AI Governance - Emergency Fix Script');
        console.log('============================================');
        console.log(`Started at: ${new Date().toISOString()}`);
        const emergencyFix = new EmergencyGovernanceFix();
        await emergencyFix.executeEmergencyIntervention();
        console.log('\n🎯 Emergency fix completed - system should be operational');
        process.exit(0);
    }
    catch (error) {
        console.error('\n💥 CRITICAL ERROR in emergency fix script:', error);
        console.log('\n🔄 Please retry or contact system administrator');
        process.exit(1);
    }
}
if (require.main === module) {
    main().catch(console.error);
}
//# sourceMappingURL=emergency-governance-fix.js.map