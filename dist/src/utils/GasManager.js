import { ethers } from 'ethers';
import { contractLogger as logger } from './logger.js';
export class GasManager {
    provider;
    gasHistory = [];
    historySize = 10;
    lastUpdate = 0;
    updateInterval = 30000; // 30 seconds
    constructor(provider) {
        this.provider = provider;
    }
    /**
     * Get optimized gas configuration for a transaction
     */
    async getOptimizedGasConfig(estimatedGas, priority = 'standard') {
        try {
            await this.updateGasHistory();
            const feeData = await this.provider.getFeeData();
            const networkGasPrice = await this.getSmartGasPrice();
            // Safety multipliers based on priority
            const gasMultipliers = {
                low: { limit: 1.1, price: 1.0 },
                standard: { limit: 1.2, price: 1.1 },
                high: { limit: 1.5, price: 1.25 }
            };
            const multiplier = gasMultipliers[priority];
            // Calculate gas limit with safety buffer
            const gasLimit = BigInt(Math.ceil(Number(estimatedGas) * multiplier.limit));
            // Handle EIP-1559 vs legacy transactions
            if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
                // EIP-1559 transaction
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
                // Legacy transaction
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
            logger.error('Failed to get optimized gas config:', error);
            // Fallback to conservative defaults
            return {
                gasPrice: ethers.parseUnits('20', 'gwei'),
                gasLimit: estimatedGas * 150n / 100n, // 50% buffer
                retryMultiplier: 1.3,
                maxRetries: 2
            };
        }
    }
    /**
     * Execute transaction with automatic retry and gas escalation
     */
    async executeWithRetry(transactionFunction, initialGasEstimate, operationName = 'Transaction') {
        let lastError = null;
        for (let attempt = 1; attempt <= 5; attempt++) {
            try {
                logger.info(`Executing ${operationName} (attempt ${attempt}/5)`, {
                    gasEstimate: initialGasEstimate.toString(),
                    attempt
                });
                // Get gas config for this attempt
                const priority = attempt <= 2 ? 'standard' : 'high';
                const gasConfig = await this.getOptimizedGasConfig(initialGasEstimate, priority);
                // Apply retry escalation
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
                // Execute the transaction
                const result = await transactionFunction(gasConfig);
                logger.info(`${operationName} successful on attempt ${attempt}`, {
                    gasLimit: gasConfig.gasLimit.toString(),
                    gasPrice: gasConfig.gasPrice?.toString() || 'EIP-1559',
                    attempt
                });
                return result;
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                logger.warn(`${operationName} failed on attempt ${attempt}`, {
                    error: lastError.message,
                    attempt,
                    willRetry: attempt < 5
                });
                // Check if we should retry
                if (!this.shouldRetry(lastError, attempt)) {
                    break;
                }
                // Wait before retry with exponential backoff
                if (attempt < 5) {
                    await this.waitWithBackoff(attempt);
                }
            }
        }
        // All retries failed
        const errorMessage = `${operationName} failed after 5 attempts: ${lastError?.message}`;
        logger.error(errorMessage, { lastError });
        throw new Error(errorMessage);
    }
    /**
     * Get smart gas price based on network conditions
     */
    async getSmartGasPrice() {
        try {
            const feeData = await this.provider.getFeeData();
            if (feeData.gasPrice) {
                return feeData.gasPrice;
            }
            // Fallback to historical average if available
            if (this.gasHistory.length > 0) {
                const average = this.gasHistory.reduce((sum, price) => sum + price, 0n) / BigInt(this.gasHistory.length);
                return average;
            }
            // Final fallback
            return ethers.parseUnits('20', 'gwei');
        }
        catch (error) {
            logger.warn('Failed to get smart gas price, using fallback:', error);
            return ethers.parseUnits('25', 'gwei');
        }
    }
    /**
     * Update gas price history for smart pricing
     */
    async updateGasHistory() {
        const now = Date.now();
        if (now - this.lastUpdate < this.updateInterval) {
            return; // Update not needed yet
        }
        try {
            const feeData = await this.provider.getFeeData();
            if (feeData.gasPrice) {
                this.gasHistory.push(feeData.gasPrice);
                // Keep only recent history
                if (this.gasHistory.length > this.historySize) {
                    this.gasHistory = this.gasHistory.slice(-this.historySize);
                }
                this.lastUpdate = now;
            }
        }
        catch (error) {
            logger.warn('Failed to update gas history:', error);
        }
    }
    /**
     * Escalate gas limit for retry attempts
     */
    escalateGasLimit(baseGasLimit, attempt) {
        // Increase gas limit by 20% per retry, max 100% increase
        const increasePercent = Math.min(20 * (attempt - 1), 100);
        return baseGasLimit * BigInt(100 + increasePercent) / 100n;
    }
    /**
     * Escalate gas price for retry attempts
     */
    escalateGasPrice(baseGasPrice, attempt) {
        // Increase gas price by 25% per retry, max 150% increase
        const increasePercent = Math.min(25 * (attempt - 1), 150);
        return baseGasPrice * BigInt(100 + increasePercent) / 100n;
    }
    /**
     * Determine if we should retry based on error type
     */
    shouldRetry(error, attempt) {
        if (attempt >= 5)
            return false;
        const errorMessage = error.message.toLowerCase();
        // Retry on these errors
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
        // Don't retry on these errors
        const nonRetryableErrors = [
            'execution reverted',
            'invalid opcode',
            'revert',
            'invalid signature',
            'insufficient allowance'
        ];
        // Check for non-retryable errors first
        if (nonRetryableErrors.some(err => errorMessage.includes(err))) {
            return false;
        }
        // Check for retryable errors
        if (retryableErrors.some(err => errorMessage.includes(err))) {
            return true;
        }
        // Default: retry for first 3 attempts for unknown errors
        return attempt <= 3;
    }
    /**
     * Wait with exponential backoff between retries
     */
    async waitWithBackoff(attempt) {
        const baseDelay = 2000; // 2 seconds
        const delay = baseDelay * Math.pow(2, attempt - 1);
        const jitter = Math.random() * 1000; // Add randomness
        const totalDelay = Math.min(delay + jitter, 30000); // Max 30 seconds
        logger.info(`Waiting ${totalDelay}ms before retry...`, { attempt });
        await new Promise(resolve => setTimeout(resolve, totalDelay));
    }
    /**
     * Get current gas metrics
     */
    getGasMetrics() {
        const averageGasPrice = this.gasHistory.length > 0
            ? ethers.formatUnits(this.gasHistory.reduce((sum, price) => sum + price, 0n) / BigInt(this.gasHistory.length), 'gwei')
            : '0';
        return {
            historySize: this.gasHistory.length,
            averageGasPrice: averageGasPrice + ' gwei',
            lastUpdate: this.lastUpdate,
            updateInterval: this.updateInterval
        };
    }
}
//# sourceMappingURL=GasManager.js.map