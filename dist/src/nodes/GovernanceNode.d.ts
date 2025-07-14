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
    private createStrategy;
    start(): Promise<void>;
    stop(): void;
    createDailyProposal(): Promise<void>;
    checkAndVoteOnProposals(): Promise<void>;
    private checkBalances;
    private delay;
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
    getState(): GovernanceNodeState;
    getNodeId(): string;
    isNodeActive(): boolean;
}
//# sourceMappingURL=GovernanceNode.d.ts.map