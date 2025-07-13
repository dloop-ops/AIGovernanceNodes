import { ethers } from 'ethers';
import { NodeConfig, GovernanceNodeState } from '../types/index.js';
import { WalletService } from './WalletService.js';
export declare class GovernanceNode {
    private nodeId;
    private wallet;
    private contractService;
    private marketDataService;
    private strategy;
    private isActive;
    private lastProposalTime;
    private lastVoteTime;
    private proposalsCreated;
    private votesAcast;
    private walletIndex;
    constructor(config: NodeConfig, wallet: ethers.Wallet, walletService: WalletService);
    getNodeId(): string;
    isNodeActive(): boolean;
    getStatus(): GovernanceNodeState;
    start(): Promise<void>;
    stop(): Promise<void>;
    processActiveProposals(): Promise<void>;
    private processProposalBatch;
    private processProposalWithTimeout;
    private hasAlreadyVoted;
    private makeVotingDecision;
    private castVote;
    private isValidProposal;
    private delay;
    private getActiveProposalsDirectly;
}
//# sourceMappingURL=GovernanceNode.d.ts.map