import { ContractService } from './ContractService.js';
import { MarketDataService } from './MarketDataService.js';
import { ProposalParams } from '../types/index.js';
export declare class ProposalService {
    private contractService;
    private marketDataService;
    constructor(contractService: ContractService, marketDataService: MarketDataService);
    /**
     * Generate investment proposals based on market analysis
     */
    generateProposals(nodeId: string): Promise<ProposalParams[]>;
    /**
     * Create a proposal from market recommendation
     */
    private createProposalFromRecommendation;
    /**
     * Create a portfolio rebalance proposal
     */
    private createRebalanceProposal;
    /**
     * Calculate investment amount based on various factors
     */
    private calculateInvestmentAmount;
    /**
     * Summarize market conditions for proposal metadata
     */
    private summarizeMarketConditions;
    /**
     * Validate proposal parameters
     */
    validateProposal(proposal: ProposalParams): boolean;
    /**
     * Prioritize proposals based on confidence and market conditions
     */
    prioritizeProposals(proposals: ProposalParams[]): ProposalParams[];
    /**
     * Get proposal summary for logging
     */
    getProposalSummary(proposal: ProposalParams): string;
}
//# sourceMappingURL=ProposalService.d.ts.map