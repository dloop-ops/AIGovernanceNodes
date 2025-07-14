"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmergencyGovernanceService = void 0;
const CriticalProductionFixes_1 = require("./CriticalProductionFixes");
class EmergencyGovernanceService {
    constructor(contractService, walletService) {
        this.isExecuting = false;
        this.contractService = contractService;
        this.walletService = walletService;
        this.criticalFixes = new CriticalProductionFixes_1.CriticalProductionFixes(contractService, walletService);
    }
    async executeEmergencyVoting() {
        if (this.isExecuting) {
            return {
                success: false,
                message: 'Emergency voting already in progress',
                details: { status: 'busy' }
            };
        }
        this.isExecuting = true;
        const startTime = Date.now();
        try {
            console.log('🚨 STARTING EMERGENCY GOVERNANCE INTERVENTION');
            console.log('============================================');
            console.log('🏥 Step 1: Emergency health check...');
            const isHealthy = await this.performQuickHealthCheck();
            if (!isHealthy) {
                throw new Error('System health check failed - aborting emergency voting');
            }
            console.log('🗳️  Step 2: Executing emergency voting round...');
            await this.criticalFixes.executeEmergencyVotingRound();
            console.log('📊 Step 3: Verifying voting results...');
            const results = await this.verifyVotingResults();
            const totalTime = Date.now() - startTime;
            console.log('✅ EMERGENCY GOVERNANCE INTERVENTION COMPLETED');
            console.log(`⏱️  Total time: ${totalTime}ms`);
            return {
                success: true,
                message: 'Emergency voting completed successfully',
                details: {
                    executionTime: totalTime,
                    results: results,
                    timestamp: new Date().toISOString()
                }
            };
        }
        catch (error) {
            const totalTime = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('❌ EMERGENCY GOVERNANCE INTERVENTION FAILED');
            console.error(`⏱️  Failed after: ${totalTime}ms`);
            console.error(`🚨 Error: ${errorMessage}`);
            return {
                success: false,
                message: `Emergency voting failed: ${errorMessage}`,
                details: {
                    executionTime: totalTime,
                    error: errorMessage,
                    timestamp: new Date().toISOString()
                }
            };
        }
        finally {
            this.isExecuting = false;
        }
    }
    async performQuickHealthCheck() {
        try {
            console.log('🔍 Testing basic connectivity...');
            const proposals = await this.contractService.getProposals();
            console.log(`✅ Successfully accessed ${proposals.length} proposals`);
            return true;
        }
        catch (error) {
            console.error('❌ Health check failed:', error);
            return false;
        }
    }
    async verifyVotingResults() {
        try {
            console.log('📋 Checking recent voting activity...');
            const proposals = await this.contractService.getProposals();
            const activeProposals = proposals.filter(p => p.state?.toString() === 'ACTIVE' || p.state === 1);
            console.log(`📊 Found ${activeProposals.length} active proposals after voting round`);
            return {
                totalProposals: proposals.length,
                activeProposals: activeProposals.length,
                status: 'verified'
            };
        }
        catch (error) {
            console.error('❌ Result verification failed:', error);
            return {
                status: 'verification_failed',
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
    async getGovernanceStatus() {
        try {
            const proposals = await this.contractService.getProposals();
            const activeProposals = proposals.filter(p => p.state?.toString() === 'ACTIVE' || p.state === 1);
            const usdcProposals = activeProposals.filter(p => p.assetAddress.toLowerCase().includes('1c7d4b196cb0c7b01d743fbc6116a902379c7238'));
            return {
                status: 'operational',
                totalProposals: proposals.length,
                activeProposals: activeProposals.length,
                usdcProposals: usdcProposals.length,
                isExecuting: this.isExecuting,
                lastUpdate: new Date().toISOString()
            };
        }
        catch (error) {
            return {
                status: 'error',
                error: error instanceof Error ? error.message : String(error),
                isExecuting: this.isExecuting,
                lastUpdate: new Date().toISOString()
            };
        }
    }
    async triggerManualVoting() {
        console.log('🔄 Manual emergency voting triggered');
        return this.executeEmergencyVoting();
    }
    shouldTriggerEmergency() {
        return !this.isExecuting;
    }
}
exports.EmergencyGovernanceService = EmergencyGovernanceService;
exports.default = EmergencyGovernanceService;
//# sourceMappingURL=EmergencyGovernanceService.js.map