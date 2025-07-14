#!/usr/bin/env ts-node
declare class MultiNodeVoting {
    private contractService;
    private walletService;
    private readonly TIMEOUT;
    private readonly MAX_PROPOSALS;
    private readonly RPC_TIMEOUT;
    private readonly OPERATION_DELAY;
    constructor();
    private initializeServices;
    executeMultiNodeVoting(): Promise<void>;
    private healthCheck;
    private getActiveProposals;
    private processVotingAllNodes;
    private makeVotingDecision;
    private checkVoteStatus;
    private castVote;
    private delay;
}
export { MultiNodeVoting };
//# sourceMappingURL=multi-node-voting.d.ts.map