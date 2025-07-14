import { WalletService } from './WalletService.js';
import { ContractService } from './ContractService.js';
export declare class TokenService {
    private walletService;
    private contractService;
    private readonly minTokenBalance;
    constructor(walletService: WalletService, contractService: ContractService);
    hasMinimumTokens(nodeIndex: number): Promise<boolean>;
    requestTokensFromFaucet(nodeIndex: number): Promise<boolean>;
    ensureMinimumTokensForAllNodes(): Promise<void>;
    getTokenStatusForAllNodes(): Promise<Array<{
        nodeIndex: number;
        address: string;
        balance: string;
        hasMinimum: boolean;
        votingPower: string;
    }>>;
}
//# sourceMappingURL=TokenService.d.ts.map