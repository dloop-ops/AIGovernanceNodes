#!/usr/bin/env ts-node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiNodeVoting = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const ethers_1 = require("ethers");
const ContractService_js_1 = require("../../src/services/ContractService.js");
const WalletService_js_1 = require("../../src/services/WalletService.js");
dotenv_1.default.config();
class MultiNodeVoting {
    constructor() {
        this.TIMEOUT = 60000;
        this.MAX_PROPOSALS = 10;
        this.RPC_TIMEOUT = 30000;
        this.OPERATION_DELAY = 3000;
        console.log('🗳️ INITIALIZING MULTI-NODE VOTING SYSTEM');
        console.log('========================================');
        this.initializeServices();
    }
    initializeServices() {
        try {
            this.walletService = new WalletService_js_1.WalletService();
            console.log('✅ WalletService initialized');
            this.contractService = new ContractService_js_1.ContractService(this.walletService);
            console.log('✅ ContractService initialized');
        }
        catch (error) {
            console.error('❌ Failed to initialize services:', error);
            throw new Error('Service initialization failed');
        }
    }
    async executeMultiNodeVoting() {
        const startTime = Date.now();
        try {
            console.log('🗳️ STARTING MULTI-NODE VOTING');
            console.log('=============================');
            console.log(`⏰ Start time: ${new Date().toISOString()}`);
            console.log('\n🏥 STEP 1: Health Check');
            const isHealthy = await this.healthCheck();
            if (!isHealthy) {
                throw new Error('🚨 CRITICAL: System health check failed');
            }
            console.log('\n📊 STEP 2: Fetching Active Proposals');
            const proposals = await this.getActiveProposals();
            if (proposals.length === 0) {
                console.log('ℹ️  No active proposals found');
                return;
            }
            console.log(`📋 Found ${proposals.length} active proposals`);
            console.log('\n🗳️  STEP 3: Multi-Node Voting Process');
            await this.processVotingAllNodes(proposals);
            const totalTime = Date.now() - startTime;
            console.log('\n✅ MULTI-NODE VOTING COMPLETED');
            console.log('==============================');
            console.log(`⏱️  Total execution time: ${totalTime}ms`);
        }
        catch (error) {
            const totalTime = Date.now() - startTime;
            console.error('\n❌ MULTI-NODE VOTING FAILED');
            console.error('===========================');
            console.error(`⏱️  Failed after: ${totalTime}ms`);
            console.error(`🚨 Error: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async healthCheck() {
        return new Promise(async (resolve) => {
            console.log('🔍 Testing basic connectivity...');
            const timeoutId = setTimeout(() => {
                console.log('⏰ Health check timeout');
                resolve(false);
            }, this.RPC_TIMEOUT);
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
    async getActiveProposals() {
        return new Promise(async (resolve) => {
            console.log('📋 Fetching active proposals...');
            const timeoutId = setTimeout(() => {
                console.log('⏰ Proposal fetching timeout');
                resolve([]);
            }, this.RPC_TIMEOUT);
            try {
                const provider = this.walletService.getProvider();
                const assetDao = new ethers_1.ethers.Contract(process.env.ASSET_DAO_CONTRACT_ADDRESS, [
                    "function getProposalCount() view returns (uint256)",
                    "function getProposal(uint256) view returns (uint256, uint8, address, uint256, string, address, uint256, uint256, uint256, uint256, uint8, bool)"
                ], provider);
                const count = await assetDao.getProposalCount();
                const totalCount = Number(count);
                const startFrom = Math.max(1, totalCount - 19);
                console.log(`📊 Checking proposals ${startFrom}-${totalCount} for active ones...`);
                const activeProposals = [];
                for (let i = startFrom; i <= totalCount; i++) {
                    try {
                        const proposalData = await assetDao.getProposal(i);
                        const state = proposalData[10];
                        if (Number(state) === 1) {
                            const currentTime = Math.floor(Date.now() / 1000);
                            const votingEnds = Number(proposalData[7]);
                            const timeLeft = votingEnds - currentTime;
                            if (timeLeft > 0) {
                                activeProposals.push({
                                    id: i.toString(),
                                    proposer: proposalData[2],
                                    proposalType: proposalData[1].toString(),
                                    state: Number(proposalData[10]),
                                    assetAddress: proposalData[5],
                                    amount: ethers_1.ethers.formatEther(proposalData[3]),
                                    description: proposalData[4] || `Multi-Node Proposal ${i}`,
                                    votesFor: "0",
                                    votesAgainst: "0",
                                    startTime: Number(proposalData[6]),
                                    endTime: Number(proposalData[7]),
                                    executed: false,
                                    cancelled: false,
                                    title: `Multi-Node Proposal ${i}`,
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
                        console.log(`   ❌ Error checking proposal ${i}:`, error);
                    }
                }
                clearTimeout(timeoutId);
                resolve(activeProposals);
            }
            catch (error) {
                clearTimeout(timeoutId);
                console.error('❌ Failed to fetch proposals:', error);
                resolve([]);
            }
        });
    }
    async processVotingAllNodes(proposals) {
        console.log(`🎯 Processing ${proposals.length} proposals with all 5 nodes`);
        let totalVotes = 0;
        for (const proposal of proposals) {
            console.log(`\n📋 Processing Proposal ${proposal.id}`);
            console.log(`   💰 Amount: ${proposal.amount} ETH`);
            console.log(`   📍 Asset: ${proposal.assetAddress.slice(0, 10)}...`);
            const shouldVote = this.makeVotingDecision(proposal);
            if (!shouldVote.vote) {
                console.log(`   ⏭️  Skipping proposal ${proposal.id} (doesn't meet voting criteria)`);
                continue;
            }
            console.log(`   🎯 Decision: Vote ${shouldVote.support ? 'YES' : 'NO'} on proposal ${proposal.id}`);
            for (let nodeIndex = 0; nodeIndex < 5; nodeIndex++) {
                const nodeId = `ai-gov-${String(nodeIndex + 1).padStart(2, '0')}`;
                const nodeAddress = this.walletService.getWallet(nodeIndex).address;
                console.log(`\n   🤖 Node ${nodeIndex + 1} (${nodeId}): ${nodeAddress.slice(0, 10)}...`);
                try {
                    const hasVoted = await this.checkVoteStatus(proposal.id, nodeIndex);
                    if (hasVoted) {
                        console.log(`      ℹ️  Already voted`);
                        continue;
                    }
                    const txHash = await this.castVote(proposal.id, nodeIndex, shouldVote.support);
                    console.log(`      ✅ Vote cast: ${txHash.slice(0, 10)}...`);
                    totalVotes++;
                    if (nodeIndex < 4) {
                        console.log(`      ⏱️  Waiting ${this.OPERATION_DELAY}ms before next node...`);
                        await this.delay(this.OPERATION_DELAY);
                    }
                }
                catch (error) {
                    console.error(`      ❌ Failed to vote:`, error);
                }
            }
        }
        console.log(`\n📊 MULTI-NODE VOTING SUMMARY`);
        console.log(`   📝 Total votes cast: ${totalVotes}`);
    }
    makeVotingDecision(proposal) {
        const isUSDC = proposal.assetAddress.toLowerCase().includes('1c7d4b196cb0c7b01d743fbc6116a902379c7238');
        const amount = parseFloat(proposal.amount);
        console.log(`   🔍 Asset analysis: ${proposal.assetAddress.slice(0, 12)}... (USDC: ${isUSDC})`);
        console.log(`   💰 Amount analysis: ${amount} ETH (${amount} threshold)`);
        if (amount <= 1) {
            console.log(`   ✅ Small amount proposal - voting YES`);
            return { vote: true, support: true };
        }
        if (isUSDC && amount <= 5000) {
            console.log(`   ✅ USDC proposal under threshold - voting YES`);
            return { vote: true, support: true };
        }
        console.log(`   ❌ Proposal doesn't meet criteria (amount too large or risky asset)`);
        return { vote: false, support: false };
    }
    async checkVoteStatus(proposalId, nodeIndex) {
        return new Promise(async (resolve) => {
            const timeoutId = setTimeout(() => {
                resolve(false);
            }, 5000);
            try {
                const hasVoted = await this.contractService.hasVoted(proposalId, nodeIndex);
                clearTimeout(timeoutId);
                resolve(hasVoted);
            }
            catch (error) {
                clearTimeout(timeoutId);
                resolve(false);
            }
        });
    }
    async castVote(proposalId, nodeIndex, support) {
        return new Promise(async (resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error('Vote casting timeout'));
            }, 30000);
            try {
                const txHash = await this.contractService.vote(nodeIndex, proposalId, support);
                clearTimeout(timeoutId);
                resolve(txHash);
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
exports.MultiNodeVoting = MultiNodeVoting;
async function main() {
    try {
        console.log('🗳️ Multi-Node Voting System');
        console.log('==========================');
        console.log(`Started at: ${new Date().toISOString()}`);
        const multiNodeVoting = new MultiNodeVoting();
        await multiNodeVoting.executeMultiNodeVoting();
        console.log('\n🎯 Multi-node voting completed');
        process.exit(0);
    }
    catch (error) {
        console.error('\n💥 CRITICAL ERROR:', error);
        process.exit(1);
    }
}
main().catch(console.error);
//# sourceMappingURL=multi-node-voting.js.map