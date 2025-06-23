import { ethers } from 'ethers';
import { RpcManager } from './RpcManager.js';
export interface NodeRegistrationConfig {
    nodeId: string;
    nodeAddress: string;
    nodeName: string;
    endpoint: string;
    nodeType: string;
    nodeIndex: number;
}
export interface RegistrationResult {
    success: boolean;
    isRegistered: boolean;
    transactionHash?: string;
    error?: string;
    stakeAmount?: string;
    gasUsed?: string;
}
export declare class NodeRegistrationService {
    private transactionManager;
    private rpcManager;
    private contractAddresses;
    constructor(rpcManager: RpcManager);
    registerNode(wallet: ethers.Wallet, config: NodeRegistrationConfig): Promise<RegistrationResult>;
    checkNodeRegistration(nodeAddress: string): Promise<boolean>;
    getNodeRegistrationStatus(nodeAddress: string): Promise<{
        isRegistered: boolean;
        nodeInfo?: any;
        error?: string;
    }>;
    private approveDloopTokens;
    private loadContractABI;
    batchRegisterNodes(wallets: ethers.Wallet[], configs: NodeRegistrationConfig[]): Promise<RegistrationResult[]>;
    private delay;
}
//# sourceMappingURL=NodeRegistrationService.d.ts.map