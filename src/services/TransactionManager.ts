import { ethers } from 'ethers';
import { contractLogger as logger } from '../utils/logger.js';
import { RpcManager } from './RpcManager.js';

export interface TransactionConfig {
  gasLimit?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  retries?: number;
  timeout?: number;
}

export interface TransactionResult {
  success: boolean;
  transactionHash?: string;
  blockNumber?: number;
  gasUsed?: string;
  effectiveGasPrice?: string;
  error?: string;
  retryCount?: number;
}

export class TransactionManager {
  private rpcManager: RpcManager;
  private defaultConfig: TransactionConfig = {
    gasLimit: '500000',
    retries: 3,
    timeout: 180000 // 3 minutes
  };

  constructor(rpcManager: RpcManager) {
    this.rpcManager = rpcManager;
  }

  public async executeTransaction(
    signer: ethers.Wallet,
    contractAddress: string,
    contractABI: any[],
    methodName: string,
    args: any[] = [],
    config: TransactionConfig = {}
  ): Promise<TransactionResult> {
    const mergedConfig = { ...this.defaultConfig, ...config };
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= (mergedConfig.retries || 3); attempt++) {
      try {
        logger.info('Executing blockchain transaction', {
          method: methodName,
          attempt,
          contractAddress
        });

        const result = await this.rpcManager.executeWithRetry(
          async (provider) => {
            const connectedSigner = signer.connect(provider);
            const contract = new ethers.Contract(contractAddress, contractABI, connectedSigner);

            // Enhanced gas estimation with fallbacks
            let gasLimit: string;
            let gasPrice: string | undefined;
            let maxFeePerGas: string | undefined;
            let maxPriorityFeePerGas: string | undefined;

            try {
              // Attempt gas estimation
              const estimatedGas = await contract[methodName].estimateGas(...args);
              gasLimit = ((estimatedGas * BigInt(120)) / BigInt(100)).toString(); // 20% buffer

              logger.debug('Gas estimation successful', {
                method: methodName,
                estimatedGas: estimatedGas.toString(),
                gasLimitWithBuffer: gasLimit
              });
            } catch (gasError: any) {
              // Fallback to fixed gas limit for problematic methods
              gasLimit = this.getMethodSpecificGasLimit(methodName);
              logger.warn('Gas estimation failed, using fallback', {
                method: methodName,
                fallbackGasLimit: gasLimit,
                error: gasError.message
              });
            }

            // Get fee data with fallbacks
            try {
              const feeData = await provider.getFeeData();
              if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
                // EIP-1559 transaction
                maxFeePerGas =
                  mergedConfig.maxFeePerGas ||
                  ((feeData.maxFeePerGas * BigInt(110)) / BigInt(100)).toString();
                maxPriorityFeePerGas =
                  mergedConfig.maxPriorityFeePerGas || feeData.maxPriorityFeePerGas.toString();
              } else {
                // Legacy transaction
                gasPrice = feeData.gasPrice
                  ? ((feeData.gasPrice * BigInt(110)) / BigInt(100)).toString()
                  : '20000000000';
              }
            } catch (feeError) {
              logger.warn('Fee data fetch failed, using defaults', { error: feeError });
              gasPrice = '20000000000'; // 20 Gwei fallback
            }

            const transactionRequest: any = {
              gasLimit
            };

            if (maxFeePerGas && maxPriorityFeePerGas) {
              transactionRequest.maxFeePerGas = maxFeePerGas;
              transactionRequest.maxPriorityFeePerGas = maxPriorityFeePerGas;
            } else {
              transactionRequest.gasPrice = gasPrice;
            }

            logger.debug('Enhanced transaction parameters', {
              method: methodName,
              gasLimit,
              gasPrice,
              maxFeePerGas,
              maxPriorityFeePerGas,
              argsLength: args.length
            });

            // Execute the contract method with enhanced error handling
            const transaction = await contract[methodName](...args, transactionRequest);

            logger.info('Transaction submitted successfully', {
              method: methodName,
              txHash: transaction.hash,
              attempt,
              gasLimit,
              gasUsed: transaction.gasLimit?.toString()
            });

            // Wait for confirmation with timeout
            const receipt = await Promise.race([
              transaction.wait(1),
              new Promise<never>((_, reject) =>
                setTimeout(
                  () => reject(new Error('Transaction confirmation timeout')),
                  mergedConfig.timeout
                )
              )
            ]);

            if (receipt.status === 1) {
              logger.info('Transaction confirmed successfully', {
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
            } else {
              throw new Error(`Transaction failed with status: ${receipt.status}`);
            }
          },
          3,
          `Execute ${methodName}`
        );

        return result;
      } catch (error: any) {
        lastError = error;

        const isRetryableError = this.isRetryableError(error);

        logger.warn('Transaction attempt failed', {
          method: methodName,
          attempt,
          error: error.message,
          isRetryable: isRetryableError,
          willRetry: isRetryableError && attempt < (mergedConfig.retries || 3)
        });

        if (isRetryableError && attempt < (mergedConfig.retries || 3)) {
          await this.delay(Math.pow(2, attempt) * 1000); // Exponential backoff
        } else if (!isRetryableError) {
          break; // Don't retry non-retryable errors
        }
      }
    }

    logger.error('Transaction execution failed', {
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

  private getMethodSpecificGasLimit(methodName: string): string {
    const gasLimits: Record<string, string> = {
      registerNodeWithStaking: '1000000',
      approve: '100000',
      transfer: '100000',
      mint: '200000',
      registerNode: '800000',
      deregisterNode: '300000'
    };

    return gasLimits[methodName] || '500000';
  }

  private isRetryableError(error: any): boolean {
    const message = error.message?.toLowerCase() || '';
    const code = error.code;

    // Non-retryable errors
    if (
      message.includes('insufficient funds') ||
      message.includes('nonce too low') ||
      message.includes('already known') ||
      message.includes('replacement transaction underpriced') ||
      code === 'INSUFFICIENT_FUNDS' ||
      code === 'NONCE_EXPIRED'
    ) {
      return false;
    }

    // Retryable errors
    return (
      message.includes('timeout') ||
      message.includes('network') ||
      message.includes('connection') ||
      message.includes('rate limit') ||
      code === 'NETWORK_ERROR' ||
      code === 'TIMEOUT' ||
      code === 'SERVER_ERROR'
    );
  }

  public async executeContractRead(
    contractAddress: string,
    contractABI: any[],
    methodName: string,
    args: any[] = []
  ): Promise<any> {
    return await this.rpcManager.executeWithRetry(
      async (provider) => {
        const contract = new ethers.Contract(contractAddress, contractABI, provider);
        const result = await contract[methodName](...args);

        logger.debug('Contract read operation completed', {
          method: methodName,
          contractAddress,
          result: typeof result === 'string' ? result.substring(0, 100) : result
        });

        return result;
      },
      3,
      `Read ${methodName}`
    );
  }

  public async waitForTransactionConfirmation(
    transactionHash: string,
    confirmations: number = 1,
    timeout: number = 300000 // 5 minutes
  ): Promise<ethers.TransactionReceipt> {
    return await this.rpcManager.executeWithRetry(
      async (provider) => {
        logger.info('Waiting for transaction confirmation', {
          txHash: transactionHash,
          confirmations
        });

        const receipt = await Promise.race([
          provider.waitForTransaction(transactionHash, confirmations),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Confirmation timeout')), timeout)
          )
        ]);

        if (!receipt) {
          throw new Error('Transaction receipt not found');
        }

        logger.info('Transaction confirmed', {
          txHash: transactionHash,
          blockNumber: receipt.blockNumber,
          status: receipt.status
        });

        return receipt;
      },
      3,
      'Wait for confirmation'
    );
  }

  public async estimateGas(
    signer: ethers.Wallet,
    contractAddress: string,
    contractABI: any[],
    methodName: string,
    args: any[] = []
  ): Promise<bigint> {
    return await this.rpcManager.executeWithRetry(
      async (provider) => {
        const connectedSigner = signer.connect(provider);
        const contract = new ethers.Contract(contractAddress, contractABI, connectedSigner);

        const gasEstimate = await contract[methodName].estimateGas(...args);

        logger.debug('Gas estimation completed', {
          method: methodName,
          gasEstimate: gasEstimate.toString()
        });

        return gasEstimate;
      },
      3,
      `Estimate gas for ${methodName}`
    );
  }

  public async getTransactionStatus(transactionHash: string): Promise<{
    status: 'pending' | 'confirmed' | 'failed' | 'not_found';
    blockNumber?: number;
    confirmations?: number;
  }> {
    try {
      return await this.rpcManager.executeWithRetry(
        async (provider) => {
          const receipt = await provider.getTransactionReceipt(transactionHash);

          if (!receipt) {
            // Check if transaction exists in mempool
            const tx = await provider.getTransaction(transactionHash);
            return tx ? { status: 'pending' as const } : { status: 'not_found' as const };
          }

          const currentBlock = await provider.getBlockNumber();
          const confirmations = currentBlock - receipt.blockNumber + 1;

          return {
            status: receipt.status === 1 ? ('confirmed' as const) : ('failed' as const),
            blockNumber: receipt.blockNumber,
            confirmations
          };
        },
        2,
        'Get transaction status'
      );
    } catch (error) {
      logger.error('Failed to get transaction status', {
        txHash: transactionHash,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return { status: 'not_found' as const };
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
