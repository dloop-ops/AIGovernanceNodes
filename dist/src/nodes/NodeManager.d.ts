import { GovernanceNode } from './GovernanceNode.js';
import { Scheduler } from '../utils/scheduler.js';
export declare class NodeManager {
    private nodes;
    private walletService;
    private contractService;
    private marketDataService;
    private proposalService;
    private tokenService;
    private soulboundNftService;
    private nftTransferService;
    private dloopRegistrationService;
    private scheduler;
    private isRunning;
    constructor();
    /**
     * Initialize all required services
     */
    private initializeServices;
    /**
     * Initialize and start all governance nodes
     */
    start(): Promise<void>;
    /**
     * Stop all nodes and cleanup
     */
    stop(): Promise<void>;
    /**
     * Load node configurations
     */
    private loadNodeConfigurations;
    /**
     * Initialize all governance nodes
     */
    private initializeNodes;
    /**
     * Register AI governance nodes with D-Loop protocol
     * CRITICAL: All 5 nodes are already registered - SKIP COMPLETELY
     */
    private registerGovernanceNodes;
    /**
     * Start all governance nodes
     */
    private startAllNodes;
    /**
     * Stop all governance nodes
     */
    private stopAllNodes;
    /**
     * Setup scheduled tasks for automated operations
     */
    private setupScheduledTasks;
    /**
     * AI Governance Nodes do not create proposals - they focus on voting
     * Proposals are created by Investment Nodes or human participants
     */
    private executeProposalCreation;
    /**
     * Execute voting round for all nodes
     */
    private executeVotingRound;
    /**
     * Refresh market data
     */
    private refreshMarketData;
    /**
     * Perform system health check
     */
    private performHealthCheck;
    /**
     * Perform token balance checks and monitoring
     */
    private performTokenChecks;
    /**
     * Perform SoulBound NFT authentication checks for all nodes
     * NUCLEAR OPTION: All nodes are already registered and authenticated - SKIP COMPLETELY
     */
    private performAuthenticationChecks;
    /**
     * Log comprehensive system status
     */
    private logSystemStatus;
    /**
     * Get node by ID
     */
    getNode(nodeId: string): GovernanceNode | undefined;
    /**
     * Get all nodes
     */
    getAllNodes(): Map<string, GovernanceNode>;
    /**
     * Get system status
     */
    getSystemStatus(): {
        isRunning: boolean;
        totalNodes: number;
        activeNodes: number;
        nodeStatuses: any[];
    };
    /**
     * Restart a specific node
     */
    restartNode(nodeId: string): Promise<void>;
    /**
     * Check if manager is running
     */
    isManagerRunning(): boolean;
    /**
     * Get scheduler instance
     */
    getScheduler(): Scheduler;
    /**
     * Public method to trigger immediate voting round (for manual triggers)
     */
    triggerVotingRound(): Promise<void>;
    /**
     * Public method to get active proposals (for API access)
     */
    getActiveProposals(): Promise<any[]>;
    /**
   * Check and Vote on Proposals
   */
    private checkAndVoteOnProposals;
}
//# sourceMappingURL=NodeManager.d.ts.map