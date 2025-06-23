import { ContractService } from './ContractService.js';
import { WalletService } from './WalletService.js';
/**
 * Service for managing SoulBound NFT authentication for AI governance nodes
 */
export declare class SoulboundNFTService {
    private walletService;
    private contractService;
    constructor(walletService: WalletService, contractService: ContractService);
    /**
     * Authenticate node by checking for valid SoulBound NFT
     */
    authenticateNode(nodeIndex: number): Promise<boolean>;
    /**
     * Get authentication status for all nodes
     */
    getAuthenticationStatus(): Promise<Array<{
        nodeIndex: number;
        address: string;
        isAuthenticated: boolean;
        tokenCount: number;
        tokens: string[];
    }>>;
    /**
     * Attempt to mint SoulBound NFT for node authentication
     */
    mintAuthenticationNFT(nodeIndex: number, nodeId: string, strategy: string): Promise<boolean>;
    /**
     * Validate authentication before governance operations
     */
    validateForGovernance(nodeIndex: number): Promise<void>;
    /**
     * Check if any nodes need authentication
     */
    identifyUnauthenticatedNodes(): Promise<number[]>;
    /**
     * Attempt to authenticate all nodes
     */
    authenticateAllNodes(): Promise<{
        totalNodes: number;
        authenticatedNodes: number;
        unauthenticatedNodes: number[];
    }>;
}
//# sourceMappingURL=SoulboundNFTService.d.ts.map