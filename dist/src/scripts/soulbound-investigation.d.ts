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
    initializeWithDeployer(deployerPrivateKey?: string): Promise<void>;
    getContractInfo(): Promise<ContractInfo>;
    investigateNodeNFTs(): Promise<NFTInvestigationResult[]>;
    getIdentityMetadata(): Promise<any>;
    mintMissingNFTs(missingNodes: NFTInvestigationResult[], contractInfo: ContractInfo): Promise<void>;
    verifyMinting(nodeAddresses: string[]): Promise<void>;
    checkEtherscan(): Promise<any>;
}
export { SoulboundInvestigator };
export type { NFTInvestigationResult, ContractInfo };
//# sourceMappingURL=soulbound-investigation.d.ts.map