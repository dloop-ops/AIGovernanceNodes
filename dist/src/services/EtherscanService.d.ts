export interface NFTToken {
    contractAddress: string;
    tokenID: string;
    tokenName: string;
    tokenSymbol: string;
}
export interface TransactionDetails {
    hash: string;
    blockNumber: string;
    timeStamp: string;
    from: string;
    to: string;
    value: string;
    gas: string;
    gasPrice: string;
    gasUsed: string;
    isError: string;
}
export declare class EtherscanService {
    private readonly apiKey;
    private readonly baseUrl;
    constructor();
    /**
     * Get ERC-721 NFT tokens owned by an address
     */
    getNFTTokens(address: string): Promise<NFTToken[]>;
    /**
     * Get SoulBound NFT tokens specifically for the SoulboundNFT contract
     */
    getSoulboundNFTs(address: string, soulboundContractAddress: string): Promise<NFTToken[]>;
    /**
     * Get transaction details by hash
     */
    getTransactionDetails(txHash: string): Promise<TransactionDetails | null>;
    /**
     * Verify NFT ownership at current block
     */
    verifyNFTOwnership(contractAddress: string, tokenId: string, ownerAddress: string): Promise<boolean>;
}
//# sourceMappingURL=EtherscanService.d.ts.map