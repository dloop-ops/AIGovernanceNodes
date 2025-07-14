import { ethers } from 'ethers';
import { WalletService } from './WalletService';
import { ProposalParams, Proposal, NodeInfo } from '../types/index';
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
    createProposal(nodeIndex: number, params: ProposalParams): Promise<string>;
    private getOptimizedGasPrice;
    vote(nodeIndex: number, proposalId: string, support: boolean): Promise<string>;
    getProposal(proposalId: string): Promise<Proposal>;
    getActiveProposals(): Promise<Proposal[]>;
    private mapProposalState;
    private mapProposalType;
    private getProposalSafeWithRetry;
    registerAINode(nodeIndex: number): Promise<{
        success: boolean;
        txHash?: string;
        error?: string;
    }>;
    getNodeInfo(nodeAddress: string): Promise<NodeInfo>;
    isNodeActive(nodeAddress: string): Promise<boolean>;
    getTokenBalance(nodeIndex: number): Promise<string>;
    private delay;
    getVotingPower(nodeIndex: number): Promise<string>;
    hasVoted(proposalId: string, nodeIndex: number): Promise<boolean>;
    hasValidSoulboundNFT(nodeIndex: number): Promise<boolean>;
    getNodeSoulboundTokens(nodeIndex: number): Promise<string[]>;
    mintSoulboundNFT(nodeIndex: number, metadata: string): Promise<string>;
    getProvider(): ethers.Provider;
    getContractAddresses(): any;
    getProposalCount(): Promise<number>;
    isNodeRegistered(address: string): Promise<boolean>;
    getTokenTotalSupply(): Promise<number>;
    validateContracts(): Promise<boolean>;
    getAssetAddress(symbol: string): string;
    private verifyNodeRegistration;
    private isNodeAlreadyRegistered;
    getProposals(): Promise<Proposal[]>;
    private getProposalCountWithTimeout;
    private getProposalWithRetry;
}
//# sourceMappingURL=ContractService.d.ts.map