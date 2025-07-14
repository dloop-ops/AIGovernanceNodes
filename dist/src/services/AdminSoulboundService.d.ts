export declare class AdminSoulboundService {
    private adminWallet;
    private soulboundContract;
    private provider;
    constructor();
    private initializeContract;
    checkMinterRole(): Promise<boolean>;
    mintForGovernanceNode(nodeAddress: string, nodeId: string): Promise<{
        success: boolean;
        txHash?: string;
        tokenId?: string;
        error?: string;
    }>;
    batchMintForGovernanceNodes(nodes: Array<{
        address: string;
        nodeId: string;
    }>): Promise<Array<{
        nodeId: string;
        address: string;
        success: boolean;
        txHash?: string;
        tokenId?: string;
        error?: string;
    }>>;
    verifyOwnership(nodeAddress: string): Promise<{
        hasNFT: boolean;
        tokenCount: number;
        tokenIds: string[];
    }>;
    getAdminAddress(): string;
    batchDistribute(nodes: Array<{
        nodeId: string;
        address: string;
    }>): Promise<any>;
    distributeAllSoulboundNFTs(): Promise<{
        distributed: number;
        failed: number;
        results: Array<{
            nodeId: string;
            address: string;
            success: boolean;
            txHash?: string;
            tokenId?: string;
            error?: string;
        }>;
    }>;
    private getRegisteredNodes;
}
//# sourceMappingURL=AdminSoulboundService.d.ts.map