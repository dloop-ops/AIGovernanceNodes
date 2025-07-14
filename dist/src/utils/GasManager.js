"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GasManager = void 0;
const ethers_1 = require("ethers");
const logger_js_1 = require("./logger.js");
class GasManager {
    constructor(provider) {
        this.gasHistory = [];
        this.historySize = 10;
        this.lastUpdate = 0;
        this.updateInterval = 30000;
        this.provider = provider;
    }
    async getOptimizedGasConfig(estimatedGas, priority = 'standard') {
        try {
            await this.updateGasHistory();
            const feeData = await this.provider.getFeeData();
            const networkGasPrice = await this.getSmartGasPrice();
            const gasMultipliers = {
                low: { limit: 1.1, price: 1.0 },
                standard: { limit: 1.2, price: 1.1 },
                high: { limit: 1.5, price: 1.25 }
            };
            const multiplier = gasMultipliers[priority];
            const gasLimit = BigInt(Math.ceil(Number(estimatedGas) * multiplier.limit));
            if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
                const maxPriorityFeePerGas = BigInt(Math.ceil(Number(feeData.maxPriorityFeePerGas) * multiplier.price));
                const maxFeePerGas = BigInt(Math.ceil(Number(feeData.maxFeePerGas) * multiplier.price));
                return {
                    maxFeePerGas,
                    maxPriorityFeePerGas,
                    gasLimit,
                    retryMultiplier: 1.2,
                    maxRetries: 3
                };
            }
            else {
                const gasPrice = BigInt(Math.ceil(Number(networkGasPrice) * multiplier.price));
                return {
                    gasPrice,
                    gasLimit,
                    retryMultiplier: 1.2,
                    maxRetries: 3
                };
            }
        }
        catch (error) {
            logger_js_1.contractLogger.error('Failed to get optimized gas config:', error);
            return {
                gasPrice: ethers_1.ethers.parseUnits('20', 'gwei'),
                gasLimit: (estimatedGas * 150n) / 100n,
                retryMultiplier: 1.3,
                maxRetries: 2
            };
        }
    }
    async executeWithRetry(transactionFunction, initialGasEstimate, operationName = 'Transaction') {
        let lastError = null;
        for (let attempt = 1; attempt <= 5; attempt++) {
            try {
                logger_js_1.contractLogger.info(`Executing ${operationName} (attempt ${attempt}/5)`, {
                    gasEstimate: initialGasEstimate.toString(),
                    attempt
                });
                const priority = attempt <= 2 ? 'standard' : 'high';
                const gasConfig = await this.getOptimizedGasConfig(initialGasEstimate, priority);
                if (attempt > 1) {
                    gasConfig.gasLimit = this.escalateGasLimit(gasConfig.gasLimit, attempt);
                    if (gasConfig.gasPrice) {
                        gasConfig.gasPrice = this.escalateGasPrice(gasConfig.gasPrice, attempt);
                    }
                    if (gasConfig.maxFeePerGas) {
                        gasConfig.maxFeePerGas = this.escalateGasPrice(gasConfig.maxFeePerGas, attempt);
                    }
                    if (gasConfig.maxPriorityFeePerGas) {
                        gasConfig.maxPriorityFeePerGas = this.escalateGasPrice(gasConfig.maxPriorityFeePerGas, attempt);
                    }
                }
                const result = await transactionFunction(gasConfig);
                logger_js_1.contractLogger.info(`${operationName} successful on attempt ${attempt}`, {
                    gasLimit: gasConfig.gasLimit.toString(),
                    gasPrice: gasConfig.gasPrice?.toString() || 'EIP-1559',
                    attempt
                });
                return result;
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                logger_js_1.contractLogger.warn(`${operationName} failed on attempt ${attempt}`, {
                    error: lastError.message,
                    attempt,
                    willRetry: attempt < 5
                });
                if (!this.shouldRetry(lastError, attempt)) {
                    break;
                }
                if (attempt < 5) {
                    await this.waitWithBackoff(attempt);
                }
            }
        }
        const errorMessage = `${operationName} failed after 5 attempts: ${lastError?.message}`;
        logger_js_1.contractLogger.error(errorMessage, { lastError });
        throw new Error(errorMessage);
    }
    async getSmartGasPrice() {
        try {
            const feeData = await this.provider.getFeeData();
            if (feeData.gasPrice) {
                return feeData.gasPrice;
            }
            if (this.gasHistory.length > 0) {
                const average = this.gasHistory.reduce((sum, price) => sum + price, 0n) / BigInt(this.gasHistory.length);
                return average;
            }
            return ethers_1.ethers.parseUnits('20', 'gwei');
        }
        catch (error) {
            logger_js_1.contractLogger.warn('Failed to get smart gas price, using fallback:', error);
            return ethers_1.ethers.parseUnits('25', 'gwei');
        }
    }
    async updateGasHistory() {
        const now = Date.now();
        if (now - this.lastUpdate < this.updateInterval) {
            return;
        }
        try {
            const feeData = await this.provider.getFeeData();
            if (feeData.gasPrice) {
                this.gasHistory.push(feeData.gasPrice);
                if (this.gasHistory.length > this.historySize) {
                    this.gasHistory = this.gasHistory.slice(-this.historySize);
                }
                this.lastUpdate = now;
            }
        }
        catch (error) {
            logger_js_1.contractLogger.warn('Failed to update gas history:', error);
        }
    }
    escalateGasLimit(baseGasLimit, attempt) {
        const increasePercent = Math.min(20 * (attempt - 1), 100);
        return (baseGasLimit * BigInt(100 + increasePercent)) / 100n;
    }
    escalateGasPrice(baseGasPrice, attempt) {
        const increasePercent = Math.min(25 * (attempt - 1), 150);
        return (baseGasPrice * BigInt(100 + increasePercent)) / 100n;
    }
    shouldRetry(error, attempt) {
        if (attempt >= 5)
            return false;
        const errorMessage = error.message.toLowerCase();
        const retryableErrors = [
            'replacement transaction underpriced',
            'transaction underpriced',
            'insufficient funds for gas',
            'nonce too low',
            'timeout',
            'network error',
            'connection error',
            'gas estimation error'
        ];
        const nonRetryableErrors = [
            'execution reverted',
            'invalid opcode',
            'revert',
            'invalid signature',
            'insufficient allowance'
        ];
        if (nonRetryableErrors.some((err) => errorMessage.includes(err))) {
            return false;
        }
        if (retryableErrors.some((err) => errorMessage.includes(err))) {
            return true;
        }
        return attempt <= 3;
    }
    async waitWithBackoff(attempt) {
        const baseDelay = 2000;
        const delay = baseDelay * Math.pow(2, attempt - 1);
        const jitter = Math.random() * 1000;
        const totalDelay = Math.min(delay + jitter, 30000);
        logger_js_1.contractLogger.info(`Waiting ${totalDelay}ms before retry...`, { attempt });
        await new Promise((resolve) => setTimeout(resolve, totalDelay));
    }
    getGasMetrics() {
        const averageGasPrice = this.gasHistory.length > 0
            ? ethers_1.ethers.formatUnits(this.gasHistory.reduce((sum, price) => sum + price, 0n) /
                BigInt(this.gasHistory.length), 'gwei')
            : '0';
        return {
            historySize: this.gasHistory.length,
            averageGasPrice: averageGasPrice + ' gwei',
            lastUpdate: this.lastUpdate,
            updateInterval: this.updateInterval
        };
    }
}
exports.GasManager = GasManager;
//# sourceMappingURL=GasManager.js.map