import { NFTToken } from './EtherscanService.js';
import { ContractService } from './ContractService.js';
import { WalletService } from './WalletService.js';
export interface TransferResult {
    success: boolean;
    txHash?: string;
    error?: string;
    tokenId: string;
    fromAddress: string;
    toAddress: string;
}
export declare class NFTTransferService {
    private etherscanService;
    private contractService;
    private walletService;
    private sourceAddress;
    private soulboundContractAddress;
    constructor(contractService: ContractService, walletService: WalletService);
    analyzeSoulboundNFTs(): Promise<NFTToken[]>;
    distributeSoulboundNFTs(): Promise<TransferResult[]>;
    private mintSoulboundNFTForNode;
    private getCurrentAuthenticationStatus;
    verifyDistribution(): Promise<{
        totalNodes: number;
        authenticatedNodes: number;
        verificationResults: Array<{
            nodeIndex: number;
            nodeAddress: string;
            hasValidNFT: boolean;
            tokenCount: number;
        }>;
    }>;
}
//# sourceMappingURL=NFTTransferService.d.ts.map