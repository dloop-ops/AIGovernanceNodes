import { RpcManager } from './RpcManager.js';
import { WalletService } from './WalletService.js';
export interface NodeInfo {
    nodeAddress: string;
    metadata: string;
    isActive: boolean;
    stakedAmount: bigint;
    reputation: bigint;
    activeUntil: bigint;
}
export declare class EnhancedContractService {
    private rpcManager;
    private walletService;
    private contractAddresses;
    private contractABIs;
    constructor(rpcManager: RpcManager, walletService: WalletService);
    private loadEnhancedABIs;
    registerNode(nodeIndex: number, metadata: string): Promise<string>;
    getNodeInfo(nodeAddress: string): Promise<NodeInfo | null>;
    isNodeActive(nodeAddress: string): Promise<boolean>;
    getSoulboundNFTBalance(nodeAddress: string): Promise<number>;
    getDloopTokenBalance(nodeAddress: string): Promise<string>;
    approveTokens(nodeIndex: number, spender: string, amount: string): Promise<string>;
    getContractAddresses(): any;
}
//# sourceMappingURL=EnhancedContractService.d.ts.map