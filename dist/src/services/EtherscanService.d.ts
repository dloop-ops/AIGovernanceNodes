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
    getNFTTokens(address: string): Promise<NFTToken[]>;
    getSoulboundNFTs(address: string, soulboundContractAddress: string): Promise<NFTToken[]>;
    getTransactionDetails(txHash: string): Promise<TransactionDetails | null>;
    verifyNFTOwnership(contractAddress: string, tokenId: string, ownerAddress: string): Promise<boolean>;
}
//# sourceMappingURL=EtherscanService.d.ts.map