#!/usr/bin/env node
interface NFTInvestigationResult {
    address: string;
    nodeIndex: number;
    hasNFT: boolean;
    nftCount: number;
    tokenIds: number[];
    tokenURIs: string[];
}
interface ContractInfo {
    totalSupply: number;
    deployerIsAdmin: boolean;
    deployerIsMinter: boolean;
    canMint: boolean;
}
declare class SoulboundInvestigator {
    private provider;
    private contract;
    private deployerWallet?;
    constructor();
    /**
     * Initialize with deployer private key if available
     */
    initializeWithDeployer(deployerPrivateKey?: string): Promise<void>;
    /**
     * Get contract information and permissions
     */
    getContractInfo(): Promise<ContractInfo>;
    /**
     * Check NFT assignments for all AI governance nodes
     */
    investigateNodeNFTs(): Promise<NFTInvestigationResult[]>;
    /**
     * Get identity metadata from d-loop.io
     */
    getIdentityMetadata(): Promise<any>;
    /**
     * Mint SoulBound NFTs for nodes that don't have them
     */
    mintMissingNFTs(missingNodes: NFTInvestigationResult[], contractInfo: ContractInfo): Promise<void>;
    /**
     * Verify NFT assignments after minting
     */
    verifyMinting(nodeAddresses: string[]): Promise<void>;
    /**
     * Check Etherscan for additional contract information and get ABI
     */
    checkEtherscan(): Promise<any>;
}
export { SoulboundInvestigator };
export type { NFTInvestigationResult, ContractInfo };
//# sourceMappingURL=soulbound-investigation.d.ts.map