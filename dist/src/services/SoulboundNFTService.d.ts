import { ContractService } from './ContractService.js';
import { WalletService } from './WalletService.js';
export declare class SoulboundNFTService {
    private walletService;
    private contractService;
    constructor(walletService: WalletService, contractService: ContractService);
    authenticateNode(nodeIndex: number): Promise<boolean>;
    getAuthenticationStatus(): Promise<Array<{
        nodeIndex: number;
        address: string;
        isAuthenticated: boolean;
        tokenCount: number;
        tokens: string[];
    }>>;
    mintAuthenticationNFT(nodeIndex: number, nodeId: string, strategy: string): Promise<boolean>;
    validateForGovernance(nodeIndex: number): Promise<void>;
    identifyUnauthenticatedNodes(): Promise<number[]>;
    authenticateAllNodes(): Promise<{
        totalNodes: number;
        authenticatedNodes: number;
        unauthenticatedNodes: number[];
    }>;
}
//# sourceMappingURL=SoulboundNFTService.d.ts.map