import { WalletService } from './WalletService';
import { ProposalParams, Proposal } from '../types';
export declare class QuickNodeEnhancedService {
    private httpProvider;
    private wsProvider;
    private assetDaoContract;
    private walletService;
    private contractAddress;
    private circuitBreaker;
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
     * Circuit breaker implementation for reliability
     */
    private checkCircuitBreaker;
    /**
     * Enhanced proposal creation with comprehensive safety
     */
    createProposal(nodeIndex: number, params: ProposalParams): Promise<string>;
    /**
     * Enhanced voting with safety measures
     */
    vote(nodeIndex: number, proposalId: string, support: boolean): Promise<string>;
    /**
     * Get proposals with enhanced reliability
     */
    getProposals(): Promise<Proposal[]>;
    /**
     * Check voting status
     */
    hasVoted(proposalId: string, nodeIndex: number): Promise<boolean>;
    /**
     * Event handlers for real-time monitoring
     */
    private handleProposalCreated;
    private handleVoteCast;
    private handleProposalExecuted;
    /**
     * Utility methods
     */
    private parseProposal;
    private parseProposalCreatedEvent;
    private mapProposalState;
    private mapProposalType;
    /**
     * Health check
     */
    healthCheck(): Promise<boolean>;
    /**
     * Cleanup
     */
    shutdown(): Promise<void>;
}
//# sourceMappingURL=QuickNodeEnhancedService.d.ts.map