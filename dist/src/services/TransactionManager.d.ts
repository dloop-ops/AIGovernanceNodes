import { ethers } from 'ethers';
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
export declare class TransactionManager {
    private rpcManager;
    private defaultConfig;
    constructor(rpcManager: RpcManager);
    executeTransaction(signer: ethers.Wallet, contractAddress: string, contractABI: any[], methodName: string, args?: any[], config?: TransactionConfig): Promise<TransactionResult>;
    private getMethodSpecificGasLimit;
    private isRetryableError;
    executeContractRead(contractAddress: string, contractABI: any[], methodName: string, args?: any[]): Promise<any>;
    waitForTransactionConfirmation(transactionHash: string, confirmations?: number, timeout?: number): Promise<ethers.TransactionReceipt>;
    estimateGas(signer: ethers.Wallet, contractAddress: string, contractABI: any[], methodName: string, args?: any[]): Promise<bigint>;
    getTransactionStatus(transactionHash: string): Promise<{
        status: 'pending' | 'confirmed' | 'failed' | 'not_found';
        blockNumber?: number;
        confirmations?: number;
    }>;
    private delay;
}
//# sourceMappingURL=TransactionManager.d.ts.map