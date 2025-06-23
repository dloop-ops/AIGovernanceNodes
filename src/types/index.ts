import { ethers } from 'ethers';

// Governance Node Types
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

// Market Data Types
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

// Smart Contract Types
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

export enum ProposalType {
  INVEST = 0,
  DIVEST = 1,
  REBALANCE = 2
}

export enum ProposalState {
  PENDING = 0,
  ACTIVE = 1,
  SUCCEEDED = 2,
  DEFEATED = 3,
  QUEUED = 4,
  EXECUTED = 5,
  CANCELLED = 6
}

// AI Node Registry Types
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

// Configuration Types
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

// Error Types
export class GovernanceError extends Error {
  constructor(
    message: string,
    public code: string,
    public nodeId?: string
  ) {
    super(message);
    this.name = 'GovernanceError';
  }
}

// API Response Types
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

// Strategy Types
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
