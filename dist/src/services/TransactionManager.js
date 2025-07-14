"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionManager = void 0;
const ethers_1 = require("ethers");
const logger_js_1 = require("../utils/logger.js");
class TransactionManager {
    constructor(rpcManager) {
        this.defaultConfig = {
            gasLimit: '500000',
            retries: 3,
            timeout: 180000
        };
        this.rpcManager = rpcManager;
    }
    async executeTransaction(signer, contractAddress, contractABI, methodName, args = [], config = {}) {
        const mergedConfig = { ...this.defaultConfig, ...config };
        let lastError = null;
        for (let attempt = 1; attempt <= (mergedConfig.retries || 3); attempt++) {
            try {
                logger_js_1.contractLogger.info('Executing blockchain transaction', {
                    method: methodName,
                    attempt,
                    contractAddress
                });
                const result = await this.rpcManager.executeWithRetry(async (provider) => {
                    const connectedSigner = signer.connect(provider);
                    const contract = new ethers_1.ethers.Contract(contractAddress, contractABI, connectedSigner);
                    let gasLimit;
                    let gasPrice;
                    let maxFeePerGas;
                    let maxPriorityFeePerGas;
                    try {
                        const estimatedGas = await contract[methodName].estimateGas(...args);
                        gasLimit = ((estimatedGas * BigInt(120)) / BigInt(100)).toString();
                        logger_js_1.contractLogger.debug('Gas estimation successful', {
                            method: methodName,
                            estimatedGas: estimatedGas.toString(),
                            gasLimitWithBuffer: gasLimit
                        });
                    }
                    catch (gasError) {
                        gasLimit = this.getMethodSpecificGasLimit(methodName);
                        logger_js_1.contractLogger.warn('Gas estimation failed, using fallback', {
                            method: methodName,
                            fallbackGasLimit: gasLimit,
                            error: gasError.message
                        });
                    }
                    try {
                        const feeData = await provider.getFeeData();
                        if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
                            maxFeePerGas =
                                mergedConfig.maxFeePerGas ||
                                    ((feeData.maxFeePerGas * BigInt(110)) / BigInt(100)).toString();
                            maxPriorityFeePerGas =
                                mergedConfig.maxPriorityFeePerGas || feeData.maxPriorityFeePerGas.toString();
                        }
                        else {
                            gasPrice = feeData.gasPrice
                                ? ((feeData.gasPrice * BigInt(110)) / BigInt(100)).toString()
                                : '20000000000';
                        }
                    }
                    catch (feeError) {
                        logger_js_1.contractLogger.warn('Fee data fetch failed, using defaults', { error: feeError });
                        gasPrice = '20000000000';
                    }
                    const transactionRequest = {
                        gasLimit
                    };
                    if (maxFeePerGas && maxPriorityFeePerGas) {
                        transactionRequest.maxFeePerGas = maxFeePerGas;
                        transactionRequest.maxPriorityFeePerGas = maxPriorityFeePerGas;
                    }
                    else {
                        transactionRequest.gasPrice = gasPrice;
                    }
                    logger_js_1.contractLogger.debug('Enhanced transaction parameters', {
                        method: methodName,
                        gasLimit,
                        gasPrice,
                        maxFeePerGas,
                        maxPriorityFeePerGas,
                        argsLength: args.length
                    });
                    const transaction = await contract[methodName](...args, transactionRequest);
                    logger_js_1.contractLogger.info('Transaction submitted successfully', {
                        method: methodName,
                        txHash: transaction.hash,
                        attempt,
                        gasLimit,
                        gasUsed: transaction.gasLimit?.toString()
                    });
                    const receipt = await Promise.race([
                        transaction.wait(1),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('Transaction confirmation timeout')), mergedConfig.timeout))
                    ]);
                    if (receipt.status === 1) {
                        logger_js_1.contractLogger.info('Transaction confirmed successfully', {
                            method: methodName,
                            txHash: receipt.hash,
                            blockNumber: receipt.blockNumber,
                            gasUsed: receipt.gasUsed.toString(),
                            effectiveGasPrice: receipt.effectiveGasPrice?.toString()
                        });
                        return {
                            success: true,
                            transactionHash: receipt.hash,
                            blockNumber: receipt.blockNumber,
                            gasUsed: receipt.gasUsed.toString(),
                            effectiveGasPrice: receipt.effectiveGasPrice?.toString(),
                            retryCount: attempt
                        };
                    }
                    else {
                        throw new Error(`Transaction failed with status: ${receipt.status}`);
                    }
                }, 3, `Execute ${methodName}`);
                return result;
            }
            catch (error) {
                lastError = error;
                const isRetryableError = this.isRetryableError(error);
                logger_js_1.contractLogger.warn('Transaction attempt failed', {
                    method: methodName,
                    attempt,
                    error: error.message,
                    isRetryable: isRetryableError,
                    willRetry: isRetryableError && attempt < (mergedConfig.retries || 3)
                });
                if (isRetryableError && attempt < (mergedConfig.retries || 3)) {
                    await this.delay(Math.pow(2, attempt) * 1000);
                }
                else if (!isRetryableError) {
                    break;
                }
            }
        }
        logger_js_1.contractLogger.error('Transaction execution failed', {
            method: methodName,
            finalError: lastError?.message || 'Unknown error',
            totalAttempts: mergedConfig.retries
        });
        return {
            success: false,
            error: lastError?.message || 'Transaction failed after all retries',
            retryCount: mergedConfig.retries
        };
    }
    getMethodSpecificGasLimit(methodName) {
        const gasLimits = {
            registerNodeWithStaking: '1000000',
            approve: '100000',
            transfer: '100000',
            mint: '200000',
            registerNode: '800000',
            deregisterNode: '300000'
        };
        return gasLimits[methodName] || '500000';
    }
    isRetryableError(error) {
        const message = error.message?.toLowerCase() || '';
        const code = error.code;
        if (message.includes('insufficient funds') ||
            message.includes('nonce too low') ||
            message.includes('already known') ||
            message.includes('replacement transaction underpriced') ||
            code === 'INSUFFICIENT_FUNDS' ||
            code === 'NONCE_EXPIRED') {
            return false;
        }
        return (message.includes('timeout') ||
            message.includes('network') ||
            message.includes('connection') ||
            message.includes('rate limit') ||
            code === 'NETWORK_ERROR' ||
            code === 'TIMEOUT' ||
            code === 'SERVER_ERROR');
    }
    async executeContractRead(contractAddress, contractABI, methodName, args = []) {
        return await this.rpcManager.executeWithRetry(async (provider) => {
            const contract = new ethers_1.ethers.Contract(contractAddress, contractABI, provider);
            const result = await contract[methodName](...args);
            logger_js_1.contractLogger.debug('Contract read operation completed', {
                method: methodName,
                contractAddress,
                result: typeof result === 'string' ? result.substring(0, 100) : result
            });
            return result;
        }, 3, `Read ${methodName}`);
    }
    async waitForTransactionConfirmation(transactionHash, confirmations = 1, timeout = 300000) {
        return await this.rpcManager.executeWithRetry(async (provider) => {
            logger_js_1.contractLogger.info('Waiting for transaction confirmation', {
                txHash: transactionHash,
                confirmations
            });
            const receipt = await Promise.race([
                provider.waitForTransaction(transactionHash, confirmations),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Confirmation timeout')), timeout))
            ]);
            if (!receipt) {
                throw new Error('Transaction receipt not found');
            }
            logger_js_1.contractLogger.info('Transaction confirmed', {
                txHash: transactionHash,
                blockNumber: receipt.blockNumber,
                status: receipt.status
            });
            return receipt;
        }, 3, 'Wait for confirmation');
    }
    async estimateGas(signer, contractAddress, contractABI, methodName, args = []) {
        return await this.rpcManager.executeWithRetry(async (provider) => {
            const connectedSigner = signer.connect(provider);
            const contract = new ethers_1.ethers.Contract(contractAddress, contractABI, connectedSigner);
            const gasEstimate = await contract[methodName].estimateGas(...args);
            logger_js_1.contractLogger.debug('Gas estimation completed', {
                method: methodName,
                gasEstimate: gasEstimate.toString()
            });
            return gasEstimate;
        }, 3, `Estimate gas for ${methodName}`);
    }
    async getTransactionStatus(transactionHash) {
        try {
            return await this.rpcManager.executeWithRetry(async (provider) => {
                const receipt = await provider.getTransactionReceipt(transactionHash);
                if (!receipt) {
                    const tx = await provider.getTransaction(transactionHash);
                    return tx ? { status: 'pending' } : { status: 'not_found' };
                }
                const currentBlock = await provider.getBlockNumber();
                const confirmations = currentBlock - receipt.blockNumber + 1;
                return {
                    status: receipt.status === 1 ? 'confirmed' : 'failed',
                    blockNumber: receipt.blockNumber,
                    confirmations
                };
            }, 2, 'Get transaction status');
        }
        catch (error) {
            logger_js_1.contractLogger.error('Failed to get transaction status', {
                txHash: transactionHash,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return { status: 'not_found' };
        }
    }
    delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
exports.TransactionManager = TransactionManager;
//# sourceMappingURL=TransactionManager.js.map