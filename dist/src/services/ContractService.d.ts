import { ethers } from 'ethers';
import { WalletService } from './WalletService.js';
import { ProposalParams, Proposal, NodeInfo } from '../types/index.js';
export declare class ContractService {
    private assetDaoContract;
    private aiNodeRegistryContract;
    private dloopTokenContract;
    private soulboundNftContract;
    private walletService;
    private provider;
    private rpcManager;
    constructor(walletService: WalletService);
    private initializeContracts;
    /**
     * Create a new investment proposal
     */
    createProposal(nodeIndex: number, params: ProposalParams): Promise<string>;
    /**
     * Get optimized gas price based on network conditions
     */
    private getOptimizedGasPrice;
    /**
     * Vote on a proposal
     */
    vote(nodeIndex: number, proposalId: string, support: boolean): Promise<string>;
    /**
     * Get proposal details
     */
    getProposal(proposalId: string): Promise<Proposal>;
    /**
     * Get active proposals with improved error handling and sequential processing
     */
    getActiveProposals(): Promise<Proposal[]>;
    /**
     * Enhanced proposal state mapping
     */
    private mapProposalState;
    /**
     * Map proposal type from contract value
     */
    private mapProposalType;
    /**
     * Register AI node with staking in the AI Node Registry
     * 🛑 ULTIMATE NUCLEAR OPTION: All 5 nodes are already registered - TOTAL BLOCK
     */
    registerAINode(nodeIndex: number): Promise<{
        success: boolean;
        txHash?: string;
        error?: string;
    }>;
    /**
     * Get node information
     */
    getNodeInfo(nodeAddress: string): Promise<NodeInfo>;
    /**
     * Check if node is active
     */
    isNodeActive(nodeAddress: string): Promise<boolean>;
    /**
     * Get DLOOP token balance for a node with enhanced rate limiting protection
     */
    getTokenBalance(nodeIndex: number): Promise<string>;
    /**
     * Helper method to add delay between operations
     */
    private delay;
    /**
     * Get voting power for a node
     */
    getVotingPower(nodeIndex: number): Promise<string>;
    /**
     * Check if address has voted on a proposal - with enhanced rate limiting
     */
    hasVoted(proposalId: string, nodeIndex: number): Promise<boolean>;
    /**
     * Check if node has valid SoulBound NFT for authentication
     */
    hasValidSoulboundNFT(nodeIndex: number): Promise<boolean>;
    /**
     * Get SoulBound NFT tokens owned by node
     */
    getNodeSoulboundTokens(nodeIndex: number): Promise<string[]>;
    /**
     * Mint SoulBound NFT for node authentication
     */
    mintSoulboundNFT(nodeIndex: number, metadata: string): Promise<string>;
    /**
     * Get the current provider
     */
    getProvider(): ethers.Provider;
    /**
     * Get contract addresses
     */
    getContractAddresses(): import("../types/index.js").ContractAddresses;
    /**
     * Get asset address by symbol
     */
    getAssetAddress(symbol: string): string;
    /**
     * Verify if a node is registered by checking multiple methods
     */
    private verifyNodeRegistration;
    /**
     * Check if a node is already registered to prevent redundant attempts
     */
    private isNodeAlreadyRegistered;
    getProposals(): Promise<Proposal[]>;
    private getProposalCountWithTimeout;
    private getProposalWithRetry;
}
//# sourceMappingURL=ContractService.d.ts.map