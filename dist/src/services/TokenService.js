"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenService = void 0;
const ethers_1 = require("ethers");
const logger_js_1 = require("../utils/logger.js");
class TokenService {
    constructor(walletService, contractService) {
        this.minTokenBalance = ethers_1.ethers.parseEther('100');
        this.walletService = walletService;
        this.contractService = contractService;
    }
    async hasMinimumTokens(nodeIndex) {
        try {
            const balanceStr = await this.contractService.getTokenBalance(nodeIndex);
            const balance = ethers_1.ethers.parseEther(balanceStr);
            return balance >= this.minTokenBalance;
        }
        catch (error) {
            logger_js_1.contractLogger.error(`Failed to check token balance for node ${nodeIndex}`, { error });
            return false;
        }
    }
    async requestTokensFromFaucet(nodeIndex) {
        try {
            const wallet = this.walletService.getWallet(nodeIndex);
            logger_js_1.contractLogger.info(`Requesting DLOOP tokens from faucet for node ${nodeIndex}`, {
                address: wallet.address
            });
            logger_js_1.contractLogger.warn(`No faucet available - manual token acquisition required for node ${nodeIndex}`, {
                address: wallet.address,
                requiredAmount: ethers_1.ethers.formatEther(this.minTokenBalance)
            });
            return false;
        }
        catch (error) {
            logger_js_1.contractLogger.error(`Failed to request tokens from faucet for node ${nodeIndex}`, { error });
            return false;
        }
    }
    async ensureMinimumTokensForAllNodes() {
        const nodeCount = this.walletService.getWalletCount();
        for (let i = 0; i < nodeCount; i++) {
            try {
                const hasTokens = await this.hasMinimumTokens(i);
                if (!hasTokens) {
                    logger_js_1.contractLogger.warn(`Node ${i} has insufficient DLOOP tokens for governance`, {
                        nodeIndex: i,
                        requiredAmount: ethers_1.ethers.formatEther(this.minTokenBalance)
                    });
                    await this.requestTokensFromFaucet(i);
                }
            }
            catch (error) {
                logger_js_1.contractLogger.error(`Failed to check tokens for node ${i}`, { error });
            }
        }
    }
    async getTokenStatusForAllNodes() {
        const nodeCount = this.walletService.getWalletCount();
        const results = [];
        for (let i = 0; i < nodeCount; i++) {
            try {
                const wallet = this.walletService.getWallet(i);
                const balance = await this.contractService.getTokenBalance(i);
                const votingPower = await this.contractService.getVotingPower(i);
                const hasMinimum = await this.hasMinimumTokens(i);
                results.push({
                    nodeIndex: i,
                    address: wallet.address,
                    balance,
                    hasMinimum,
                    votingPower
                });
            }
            catch (error) {
                logger_js_1.contractLogger.error(`Failed to get token status for node ${i}`, { error });
                results.push({
                    nodeIndex: i,
                    address: this.walletService.getWallet(i).address,
                    balance: 'Error',
                    hasMinimum: false,
                    votingPower: 'Error'
                });
            }
        }
        return results;
    }
}
exports.TokenService = TokenService;
//# sourceMappingURL=TokenService.js.map