import { ContractService } from './ContractService';
import { MarketDataService } from './MarketDataService';
import { ProposalParams, ProposalState } from '../types/index';
export declare class ProposalService {
    private contractService;
    private marketDataService;
    private proposalCache;
    private cacheExpiry;
    constructor(contractService: ContractService, marketDataService?: MarketDataService);
    generateProposals(nodeId: string): Promise<ProposalParams[]>;
    getAllProposals(): Promise<any[]>;
    getActiveProposals(): Promise<any[]>;
    getProposalById(id: number): Promise<any>;
    getProposalsByState(state: ProposalState): Promise<any[]>;
    getUrgentProposals(secondsRemaining: number): Promise<any[]>;
    getProposalsByProposer(proposerAddress: string): Promise<any[]>;
    analyzeProposal(proposalId: number): Promise<any>;
    getVotingTrends(): Promise<any>;
    isProposalActiveForVoting(proposal: any): boolean;
    invalidateCache(): void;
    makeVotingDecision(proposal: any): Promise<{
        vote: string;
        confidence: number;
        reasoning: string;
    }>;
    private createProposalFromRecommendation;
    private createRebalanceProposal;
    private calculateInvestmentAmount;
    private summarizeMarketConditions;
    validateProposal(proposal: ProposalParams): boolean;
    prioritizeProposals(proposals: ProposalParams[]): ProposalParams[];
    getProposalSummary(proposal: ProposalParams): string;
}
//# sourceMappingURL=ProposalService.d.ts.map