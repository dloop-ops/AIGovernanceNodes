/**
 * Admin service for minting SoulBound NFTs using admin privileges
 */
export declare class AdminSoulboundService {
    private adminWallet;
    private soulboundContract;
    private provider;
    constructor();
    private initializeContract;
    /**
     * Check if admin wallet has minter role
     */
    checkMinterRole(): Promise<boolean>;
    /**
     * Mint SoulBound NFT for a governance node
     */
    mintForGovernanceNode(nodeAddress: string, nodeId: string): Promise<{
        success: boolean;
        txHash?: string;
        tokenId?: string;
        error?: string;
    }>;
    /**
     * Batch mint SoulBound NFTs for all governance nodes
     */
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
    /**
     * Verify SoulBound NFT ownership using direct balance check
     */
    verifyOwnership(nodeAddress: string): Promise<{
        hasNFT: boolean;
        tokenCount: number;
        tokenIds: string[];
    }>;
    /**
     * Get admin wallet address
     */
    getAdminAddress(): string;
}
//# sourceMappingURL=AdminSoulboundService.d.ts.map