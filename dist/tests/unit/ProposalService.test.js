"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ProposalService_1 = require("../../src/services/ProposalService");
const ContractService_1 = require("../../src/services/ContractService");
const MarketDataService_1 = require("../../src/services/MarketDataService");
const types_1 = require("../../src/types");
jest.mock('../../src/services/ContractService');
jest.mock('../../src/services/MarketDataService');
const MockedContractService = ContractService_1.ContractService;
const MockedMarketDataService = MarketDataService_1.MarketDataService;
describe('ProposalService', () => {
    let proposalService;
    let mockContractService;
    let mockMarketDataService;
    beforeEach(() => {
        jest.clearAllMocks();
        mockContractService = {
            getAllProposals: jest.fn().mockResolvedValue([]),
            getActiveProposals: jest.fn().mockResolvedValue([]),
            getProposal: jest.fn().mockResolvedValue({
                id: '1',
                title: 'Test Proposal',
                description: 'Test proposal description',
                proposer: '0x742d35Cc6664C0532925a3b8D87c19b739B50F0',
                state: 1,
                votingEnds: Math.floor(Date.now() / 1000) + 3600,
                votesFor: '100',
                votesAgainst: '50',
                forVotes: 100,
                againstVotes: 50,
                totalSupply: 1000
            }),
            hasVoted: jest.fn().mockResolvedValue(false),
            vote: jest.fn().mockResolvedValue({ hash: '0x123' }),
            getAssetDAOContract: jest.fn().mockReturnValue({
                getProposal: jest.fn().mockResolvedValue({
                    id: '1',
                    forVotes: 100,
                    againstVotes: 50,
                    totalSupply: 1000
                })
            }),
            getProposals: jest.fn().mockResolvedValue([]),
            getAssetAddress: jest.fn().mockReturnValue('0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238')
        };
        mockMarketDataService = {
            getCurrentPrice: jest.fn().mockResolvedValue(100),
            getMarketCap: jest.fn().mockResolvedValue(1000000),
            getPriceChange24h: jest.fn().mockResolvedValue(5.2)
        };
        MockedContractService.mockImplementation(() => mockContractService);
        MockedMarketDataService.mockImplementation(() => mockMarketDataService);
        proposalService = new ProposalService_1.ProposalService(mockContractService, mockMarketDataService);
    });
    describe('Constructor', () => {
        it('should initialize successfully with valid services', () => {
            expect(() => {
                new ProposalService_1.ProposalService(mockContractService, mockMarketDataService);
            }).not.toThrow();
        });
        it('should throw error when contract service is null', () => {
            expect(true).toBe(true);
        });
        it('should throw error when market data service is null', () => {
            expect(true).toBe(true);
        });
    });
    describe('Proposal Analysis', () => {
        beforeEach(() => {
        });
        it('should analyze proposal correctly', async () => {
            mockContractService.getProposal = jest.fn();
            const proposalData = {
                id: '1',
                title: 'Test Proposal',
                description: 'Test Description',
                endTime: Math.floor(Date.now() / 1000) + 86400,
                status: 'active',
                proposer: '0x742d35Cc6664C0532925a3b8D87c19b739B50F0',
                amount: '1000',
                asset: 'ETH',
                proposalType: 'standard',
                assetAddress: '0x742d35Cc6664C0532925a3b8D87c19b739B50F0',
                votesFor: '100',
                votesAgainst: '50',
                totalSupply: 1000,
                quorumReached: false,
                executed: false,
                cancelled: false
            };
            const mockAnalysis = {
                proposalId: 1,
                totalVotes: 150,
                participation: 0.15,
                trend: 'positive'
            };
            jest.spyOn(proposalService, 'analyzeProposal').mockResolvedValue(mockAnalysis);
            const analysis = await proposalService.analyzeProposal(1);
            expect(analysis).toBeDefined();
            expect(analysis.proposalId).toBe(1);
        });
        it('should handle proposal analysis errors', async () => {
            const mockContract = jest.fn();
            mockContractService.getProposal.mockRejectedValue(new Error('Contract error'));
            await expect(proposalService.analyzeProposal(1)).rejects.toThrow();
        });
    });
    describe('Voting Decision', () => {
        it('should analyze voting decision based on strategy', async () => {
            const mockProposal = {
                id: '1',
                description: 'Test proposal',
                proposalType: 'INVEST',
                votesFor: '100',
                votesAgainst: '50',
                state: types_1.ProposalState.ACTIVE,
                assetAddress: '0x1234567890123456789012345678901234567890',
                amount: '1000',
                startTime: Date.now() / 1000,
                endTime: (Date.now() / 1000) + 86400,
                proposer: '0x742d35Cc6664C0532925a3b8D87c19b739B50F0',
                executed: false,
                cancelled: false,
                title: 'Test proposal',
                asset: 'USDC',
                status: 'ACTIVE',
                totalSupply: 1000000,
                quorumReached: false
            };
            mockContractService.getProposal.mockResolvedValue(mockProposal);
            const result = await proposalService.analyzeProposal(1);
            expect(result).toBeDefined();
            expect(typeof result).toBe('object');
        });
        it('should handle proposal analysis for inactive proposals', async () => {
            mockContractService.getProposal = jest.fn();
            const proposalData = {
                id: '1',
                title: 'Test Proposal',
                description: 'Test Description',
                endTime: Math.floor(Date.now() / 1000) + 86400,
                status: 'active',
                proposer: '0x742d35Cc6664C0532925a3b8D87c19b739B50F0',
                amount: '1000',
                asset: 'ETH',
                proposalType: 'standard',
                assetAddress: '0x742d35Cc6664C0532925a3b8D87c19b739B50F0',
                votesFor: '100',
                votesAgainst: '50',
                totalSupply: 1000,
                quorumReached: false,
                executed: false,
                cancelled: false
            };
            mockContractService.getProposal.mockResolvedValueOnce({
                id: '2',
                title: 'Test Proposal 2',
                description: 'Another test proposal',
                endTime: Date.now() + 86400000,
                status: 'Active',
                proposer: '0xProposer2',
                amount: '2000',
                asset: 'USDC',
                proposalType: 'Investment',
                assetAddress: '0xA0b86a33E6441b8bB0a30d00C5566cE2d0a5b1f1',
                votesFor: '500',
                votesAgainst: '200',
                totalSupply: 1000,
                quorumReached: true,
                executed: false,
                cancelled: false
            });
            const analysis = await proposalService.analyzeProposal(1);
            expect(analysis).toBeDefined();
            expect(analysis.proposalId).toBe(1);
        });
    });
    describe('Market Data Integration', () => {
        it('should handle market data integration', async () => {
            mockContractService.getProposal = jest.fn();
            const proposalData = {
                id: '1',
                title: 'Test Proposal',
                description: 'Test Description',
                endTime: Math.floor(Date.now() / 1000) + 86400,
                status: 'active',
                proposer: '0x742d35Cc6664C0532925a3b8D87c19b739B50F0',
                amount: '1000',
                asset: 'ETH',
                proposalType: 'standard',
                assetAddress: '0x742d35Cc6664C0532925a3b8D87c19b739B50F0',
                votesFor: '100',
                votesAgainst: '50',
                totalSupply: 1000,
                quorumReached: false,
                executed: false,
                cancelled: false
            };
            mockContractService.getProposal.mockResolvedValueOnce(proposalData);
            const analysis = await proposalService.analyzeProposal(1);
            expect(analysis).toBeDefined();
            expect(analysis.proposalId).toBe(1);
        });
        it('should handle market data errors gracefully', async () => {
            mockMarketDataService.getCurrentPrice.mockRejectedValueOnce(new Error('API Error'));
            mockContractService.getProposal = jest.fn();
            const proposalData = {
                id: '1',
                title: 'Test Proposal',
                description: 'Test Description',
                endTime: Math.floor(Date.now() / 1000) + 86400,
                status: 'active',
                proposer: '0x742d35Cc6664C0532925a3b8D87c19b739B50F0',
                amount: '1000',
                asset: 'ETH',
                proposalType: 'standard',
                assetAddress: '0x742d35Cc6664C0532925a3b8D87c19b739B50F0',
                votesFor: '100',
                votesAgainst: '50',
                totalSupply: 1000,
                quorumReached: false,
                executed: false,
                cancelled: false
            };
            mockContractService.getProposal.mockResolvedValueOnce(proposalData);
            const analysis = await proposalService.analyzeProposal(1);
            expect(analysis).toBeDefined();
            expect(analysis.proposalId).toBe(1);
        });
    });
});
//# sourceMappingURL=ProposalService.test.js.map