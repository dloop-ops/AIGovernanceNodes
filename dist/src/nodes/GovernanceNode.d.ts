import { ContractService } from '../services/ContractService.js';
import { MarketDataService } from '../services/MarketDataService.js';
import { ProposalService } from '../services/ProposalService.js';
import { WalletService } from '../services/WalletService.js';
import { NodeConfig, GovernanceNodeState } from '../types/index.js';
export declare class GovernanceNode {
    private nodeId;
    private wallet;
    private strategy;
    private contractService;
    private marketDataService;
    private proposalService;
    private walletService;
    private nodeIndex;
    private state;
    private isActive;
    constructor(config: NodeConfig, walletService: WalletService, contractService: ContractService, marketDataService: MarketDataService, proposalService: ProposalService);
    /**
     * Create strategy instance based on type
     */
    private createStrategy;
    /**
     * Start the governance node
     */
    start(): Promise<void>;
    /**
     * Stop the governance node
     */
    stop(): void;
    /**
     * Create daily investment proposal
     */
    createDailyProposal(): Promise<void>;
    /**
     * Check and vote on active AssetDAO proposals
     */
    checkAndVoteOnProposals(): Promise<void>;
    /**
     * Check wallet balances and log status - with enhanced error handling
     */
    private checkBalances;
    /**
     * Helper method to add delay between operations
     */
    private delay;
    /**
     * Get node status and statistics
     */
    getStatus(): {
        nodeId: string;
        address: string;
        strategy: string;
        isActive: boolean;
        stats: {
            proposalsCreated: number;
            votesAcast: number;
            lastProposalTime: number;
            lastVoteTime: number;
            uptime: number;
        };
    };
    /**
     * Get node state
     */
    getState(): GovernanceNodeState;
    /**
     * Get node ID
     */
    getNodeId(): string;
    /**
     * Check if node is active
     */
    isNodeActive(): boolean;
}
//# sourceMappingURL=GovernanceNode.d.ts.map