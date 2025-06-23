#!/usr/bin/env ts-node
/**
 * 🗳️ MULTI-NODE VOTING SCRIPT
 *
 * This script ensures ALL 5 AI governance nodes vote on active proposals
 * instead of just the first node.
 */
declare class MultiNodeVoting {
    private contractService;
    private walletService;
    private readonly TIMEOUT;
    private readonly MAX_PROPOSALS;
    private readonly RPC_TIMEOUT;
    private readonly OPERATION_DELAY;
    constructor();
    private initializeServices;
    /**
     * Execute voting with all 5 nodes
     */
    executeMultiNodeVoting(): Promise<void>;
    /**
     * Health check with timeout
     */
    private healthCheck;
    /**
     * Get active proposals
     */
    private getActiveProposals;
    /**
     * Process voting with all 5 nodes
     */
    private processVotingAllNodes;
    /**
     * Make voting decision
     */
    private makeVotingDecision;
    /**
     * Check vote status for specific node
     */
    private checkVoteStatus;
    /**
     * Cast vote for specific node
     */
    private castVote;
    /**
     * Utility delay function
     */
    private delay;
}
export { MultiNodeVoting };
//# sourceMappingURL=multi-node-voting.d.ts.map