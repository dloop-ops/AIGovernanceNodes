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
    /**
     * Analyze the source address for available SoulBound NFTs
     */
    analyzeSoulboundNFTs(): Promise<NFTToken[]>;
    /**
     * Transfer SoulBound NFTs to governance nodes
     * Note: SoulBound NFTs are typically non-transferable, so this will attempt minting instead
     */
    distributeSoulboundNFTs(): Promise<TransferResult[]>;
    /**
     * Mint SoulBound NFT for a specific governance node
     */
    private mintSoulboundNFTForNode;
    /**
     * Get current authentication status for all nodes
     */
    private getCurrentAuthenticationStatus;
    /**
     * Verify SoulBound NFT ownership after distribution
     */
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