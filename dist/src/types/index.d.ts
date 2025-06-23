import { ethers } from 'ethers';
export interface NodeConfig {
    id: string;
    strategy: 'conservative' | 'aggressive';
    walletIndex: number;
    enabled: boolean;
}
export interface GovernanceNodeState {
    nodeId: string;
    wallet: ethers.Wallet;
    strategy: string;
    isActive: boolean;
    lastProposalTime: number;
    lastVoteTime: number;
    proposalsCreated: number;
    votesAcast: number;
}
export interface PriceData {
    symbol: string;
    price: number;
    change24h: number;
    volume: number;
    timestamp: number;
    source: 'cryptocompare' | 'tradingview' | 'coingecko' | 'estimated' | 'default';
}
export interface MarketAnalysis {
    recommendations: {
        [asset: string]: {
            action: 'buy' | 'sell' | 'hold';
            confidence: number;
            reasoning: string;
            allocatedPercentage?: number;
        };
    };
    portfolioRebalance: boolean;
    riskScore: number;
    timestamp: number;
}
export interface ProposalParams {
    proposalType: ProposalType;
    assetAddress: string;
    amount: string;
    description: string;
    additionalData?: string;
}
export interface Proposal {
    id: string;
    proposer: string;
    proposalType: ProposalType;
    assetAddress: string;
    amount: string;
    description: string;
    votesFor: string;
    votesAgainst: string;
    startTime: number;
    endTime: number;
    executed: boolean;
    cancelled: boolean;
    state: ProposalState;
}
export declare enum ProposalType {
    INVEST = 0,
    DIVEST = 1,
    REBALANCE = 2
}
export declare enum ProposalState {
    PENDING = 0,
    ACTIVE = 1,
    SUCCEEDED = 2,
    DEFEATED = 3,
    QUEUED = 4,
    EXECUTED = 5,
    CANCELLED = 6
}
export interface NodeInfo {
    owner: string;
    endpoint: string;
    name: string;
    description: string;
    nodeType: string;
    isActive: boolean;
    reputation: number;
    registrationTime: number;
}
export interface NetworkConfig {
    name: string;
    chainId: number;
    rpcUrl: string;
    blockExplorer: string;
}
export interface ContractAddresses {
    assetDao: string;
    aiNodeRegistry: string;
    dloopToken: string;
    soulboundNft: string;
}
export declare class GovernanceError extends Error {
    code: string;
    nodeId?: string;
    constructor(message: string, code: string, nodeId?: string);
}
export interface CryptoCompareResponse {
    Response: string;
    Message?: string;
    Data?: {
        Data: Array<{
            time: number;
            high: number;
            low: number;
            open: number;
            volumefrom: number;
            volumeto: number;
            close: number;
        }>;
    };
}
export interface StrategyConfig {
    riskTolerance: number;
    maxPositionSize: number;
    diversificationThreshold: number;
    rebalanceThreshold: number;
    marketConditionWeights: {
        trending: number;
        volatility: number;
        volume: number;
    };
}
export interface InvestmentRecommendation {
    asset: string;
    action: 'buy' | 'sell' | 'hold';
    amount: string;
    confidence: number;
    reasoning: string;
    priority: number;
}
//# sourceMappingURL=index.d.ts.map