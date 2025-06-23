import { WalletService } from './WalletService.js';
import { ContractService } from './ContractService.js';
/**
 * Service for managing DLOOP token operations
 */
export declare class TokenService {
    private walletService;
    private contractService;
    private readonly minTokenBalance;
    constructor(walletService: WalletService, contractService: ContractService);
    /**
     * Check if node has sufficient tokens for governance participation
     */
    hasMinimumTokens(nodeIndex: number): Promise<boolean>;
    /**
     * Request DLOOP tokens from faucet if available
     */
    requestTokensFromFaucet(nodeIndex: number): Promise<boolean>;
    /**
     * Check and ensure all nodes have minimum tokens
     */
    ensureMinimumTokensForAllNodes(): Promise<void>;
    /**
     * Get token status for all nodes
     */
    getTokenStatusForAllNodes(): Promise<Array<{
        nodeIndex: number;
        address: string;
        balance: string;
        hasMinimum: boolean;
        votingPower: string;
    }>>;
}
//# sourceMappingURL=TokenService.d.ts.map