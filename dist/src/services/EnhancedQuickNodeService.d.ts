import { WalletService } from './WalletService';
import { ProposalParams, Proposal } from '../types';
export declare class EnhancedQuickNodeService {
    private httpProvider;
    private wsProvider;
    private assetDaoContract;
    private walletService;
    private contractAddress;
    private circuitBreaker;
    private safetyConfig;
    private activeTransactions;
    private readonly QUICKNODE_HTTP;
    private readonly QUICKNODE_WS;
    private readonly CONTRACT_ADDRESS;
    constructor(walletService: WalletService);
    /**
     * Initialize contract with HTTP provider
     */
    private initializeContract;
    /**
     * Setup WebSocket connection for real-time events
     */
    private setupWebSocketConnection;
    /**
     * Circuit breaker implementation
     */
    private checkCircuitBreaker;
    /**
     * Record circuit breaker success/failure
     */
    private recordCircuitBreakerResult;
    /**
     * Enhanced gas estimation with safety checks
     */
    private estimateGasWithSafety;
    /**
     * Enhanced proposal creation with comprehensive safety checks
     */
    createProposal(nodeIndex: number, params: ProposalParams): Promise<string>;
    /**
     * Enhanced voting with comprehensive safety and reentrancy protection
     */
    vote(nodeIndex: number, proposalId: string, support: boolean): Promise<string>;
    /**
     * Enhanced proposal retrieval with caching and error handling
     */
    getProposals(): Promise<Proposal[]>;
    /**
     * Check if a node has already voted on a proposal
     */
    hasVoted(proposalId: string, nodeIndex: number): Promise<boolean>;
    /**
     * Event handlers for real-time monitoring
     */
    private handleProposalCreated;
    private handleVoteCast;
    private handleProposalExecuted;
    /**
     * Validation helpers
     */
    private validateProposalParams;
    private validateVotingEligibility;
    /**
     * Utility methods
     */
    private getProposalWithTimeout;
    private parseProposal;
    private parseProposalCreatedEvent;
    private mapProposalState;
    private mapProposalType;
    private delay;
    /**
     * Cleanup method
     */
    shutdown(): Promise<void>;
    /**
     * Health check method
     */
    healthCheck(): Promise<boolean>;
}
//# sourceMappingURL=EnhancedQuickNodeService.d.ts.map