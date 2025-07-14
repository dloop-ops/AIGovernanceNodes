import { ethers } from 'ethers';
import { NodeConfig, GovernanceNodeState } from '../types/index';
import { WalletService } from './WalletService';
export declare class GovernanceNode {
    private nodeId;
    private wallet;
    private contractService;
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
    processVotingRound(): Promise<{
        success: boolean;
        votesSubmitted: number;
        skipped: number;
        errors: number;
    }>;
}
//# sourceMappingURL=GovernanceNode.d.ts.map