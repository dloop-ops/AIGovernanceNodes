"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiagnosticService = void 0;
const ethers_1 = require("ethers");
const logger_js_1 = require("./logger.js");
class DiagnosticService {
    constructor(walletService, contractService) {
        this.walletService = walletService;
        this.contractService = contractService;
    }
    async runFullDiagnostics() {
        const results = [];
        logger_js_1.contractLogger.info('Starting comprehensive node diagnostics...');
        for (let i = 0; i < this.walletService.getWalletCount(); i++) {
            try {
                const result = await this.diagnoseNode(i);
                results.push(result);
                logger_js_1.contractLogger.info(`Node ${i + 1} Diagnostic Summary:`, {
                    address: result.address,
                    registered: result.isRegistered,
                    dloopBalance: result.dloopBalance,
                    ethBalance: result.ethBalance,
                    hasApproval: result.hasStakeApproval,
                    errors: result.registrationErrors
                });
            }
            catch (error) {
                logger_js_1.contractLogger.error(`Failed to diagnose node ${i}:`, error);
                results.push({
                    nodeIndex: i,
                    address: 'unknown',
                    isRegistered: false,
                    dloopBalance: '0',
                    ethBalance: '0',
                    hasStakeApproval: false,
                    stakeRequirement: '0',
                    registrationErrors: [`Diagnostic failed: ${error.message}`]
                });
            }
        }
        this.generateDiagnosticSummary(results);
        return results;
    }
    async diagnoseNode(nodeIndex) {
        const wallet = this.walletService.getWallet(nodeIndex);
        const address = wallet.address;
        const errors = [];
        logger_js_1.contractLogger.info(`Diagnosing node ${nodeIndex + 1} (${address})...`);
        const ethBalance = await this.walletService.getProvider().getBalance(address);
        const ethBalanceFormatted = ethers_1.ethers.formatEther(ethBalance);
        let dloopBalance = '0';
        try {
            dloopBalance = await this.contractService.getTokenBalance(nodeIndex);
        }
        catch (error) {
            errors.push(`Failed to get DLOOP balance: ${error.message}`);
        }
        let isRegistered = false;
        try {
            const nodeInfo = await this.contractService.getNodeInfo(address);
            isRegistered = nodeInfo.isActive;
        }
        catch (error) {
            isRegistered = false;
            errors.push(`Node not registered or failed to check: ${error.message}`);
        }
        const stakeRequirement = '1000';
        let hasStakeApproval = false;
        try {
            hasStakeApproval = await this.contractService.hasValidSoulboundNFT(nodeIndex);
        }
        catch (error) {
            errors.push(`Failed to check SoulBound NFT validity: ${error.message}`);
        }
        if (ethers_1.ethers.parseEther('0.01') > ethBalance) {
            errors.push('Insufficient ETH balance for transactions (minimum 0.01 ETH recommended)');
        }
        if (ethers_1.ethers.parseEther(dloopBalance) < ethers_1.ethers.parseEther(stakeRequirement)) {
            errors.push(`Insufficient DLOOP balance. Required: ${stakeRequirement}, Available: ${dloopBalance}`);
        }
        if (!hasStakeApproval && dloopBalance !== '0') {
            errors.push('DLOOP tokens not approved for staking contract');
        }
        return {
            nodeIndex,
            address,
            isRegistered,
            dloopBalance,
            ethBalance: ethBalanceFormatted,
            hasStakeApproval,
            stakeRequirement,
            registrationErrors: errors
        };
    }
    async attemptAutoFix(nodeIndex) {
        const actions = [];
        const errors = [];
        let success = true;
        logger_js_1.contractLogger.info(`Attempting auto-fix for node ${nodeIndex + 1}...`);
        try {
            const diagnostic = await this.diagnoseNode(nodeIndex);
            if (!diagnostic.hasStakeApproval && parseFloat(diagnostic.dloopBalance) > 0) {
                try {
                    logger_js_1.contractLogger.info(`Minting SoulBound NFT for node ${nodeIndex + 1}...`);
                    const txHash = await this.contractService.mintSoulboundNFT(nodeIndex, 'Node Authentication Token');
                    actions.push(`Minted SoulBound NFT for authentication (tx: ${txHash})`);
                }
                catch (error) {
                    errors.push(`Failed to mint SoulBound NFT: ${error.message}`);
                    success = false;
                }
            }
            if (!diagnostic.isRegistered && diagnostic.hasStakeApproval) {
                try {
                    logger_js_1.contractLogger.info(`Attempting to register node ${nodeIndex + 1}...`);
                    const wallet = this.walletService.getWallet(nodeIndex);
                    await this.contractService.registerAINode(nodeIndex);
                    actions.push(`Registered node successfully`);
                }
                catch (error) {
                    errors.push(`Failed to register node: ${error.message}`);
                    success = false;
                }
            }
        }
        catch (error) {
            errors.push(`Auto-fix failed: ${error.message}`);
            success = false;
        }
        return { success, actions, errors };
    }
    generateDiagnosticSummary(results) {
        const registered = results.filter(r => r.isRegistered).length;
        const withSufficientBalance = results.filter(r => parseFloat(r.dloopBalance) > 0).length;
        const withApproval = results.filter(r => r.hasStakeApproval).length;
        const withErrors = results.filter(r => r.registrationErrors.length > 0).length;
        logger_js_1.contractLogger.info('=== DIAGNOSTIC SUMMARY ===', {
            totalNodes: results.length,
            registeredNodes: registered,
            nodesWithBalance: withSufficientBalance,
            nodesWithApproval: withApproval,
            nodesWithErrors: withErrors
        });
        if (withErrors > 0) {
            logger_js_1.contractLogger.warn(`${withErrors} nodes have registration issues that need attention`);
        }
        if (registered === results.length) {
            logger_js_1.contractLogger.info('✅ All nodes are successfully registered!');
        }
        else {
            logger_js_1.contractLogger.warn(`⚠️  ${results.length - registered} nodes need registration`);
        }
    }
    async startContinuousMonitoring(intervalMs = 60000) {
        logger_js_1.contractLogger.info(`Starting continuous node monitoring (interval: ${intervalMs}ms)`);
        setInterval(async () => {
            try {
                const results = await this.runFullDiagnostics();
                const issues = results.filter(r => r.registrationErrors.length > 0);
                if (issues.length > 0) {
                    logger_js_1.contractLogger.warn(`Monitoring alert: ${issues.length} nodes have issues`, {
                        affectedNodes: issues.map(r => r.nodeIndex + 1)
                    });
                }
            }
            catch (error) {
                logger_js_1.contractLogger.error('Monitoring cycle failed:', error);
            }
        }, intervalMs);
    }
}
exports.DiagnosticService = DiagnosticService;
//# sourceMappingURL=diagnostics.js.map