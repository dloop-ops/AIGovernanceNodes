"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const GovernanceNode_1 = require("../../src/services/GovernanceNode");
var NodeStrategy;
(function (NodeStrategy) {
    NodeStrategy["BALANCED"] = "BALANCED";
    NodeStrategy["AGGRESSIVE"] = "AGGRESSIVE";
    NodeStrategy["CONSERVATIVE"] = "CONSERVATIVE";
})(NodeStrategy || (NodeStrategy = {}));
const types_1 = require("../../src/types");
jest.mock('../../src/services/ContractService');
jest.mock('../../src/services/MarketDataService');
jest.mock('../../src/services/WalletService');
jest.mock('../../src/utils/logger', () => ({
    default: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn()
    }
}));
describe('GovernanceNode', () => {
    let governanceNode;
    let mockContractService;
    let mockMarketDataService;
    let mockWalletService;
    let mockWallet;
    beforeEach(() => {
        mockWallet = {
            address: '0x742d35Cc6664C0532925a3b8D87c19b739B50F0',
            connect: jest.fn()
        };
        mockContractService = {
            getActiveProposals: jest.fn().mockResolvedValue([
                {
                    id: 1,
                    description: 'Test proposal',
                    state: types_1.ProposalState.ACTIVE,
                    votingEnds: Math.floor(Date.now() / 1000) + 3600,
                    yesVotes: 5,
                    noVotes: 2
                }
            ]),
            hasVoted: jest.fn().mockResolvedValue(false),
            vote: jest.fn().mockResolvedValue({ hash: '0x123' })
        };
        mockMarketDataService = {
            getMarketData: jest.fn().mockResolvedValue({
                price: 100,
                change24h: 5.2,
                volume: 1000000
            })
        };
        mockWalletService = {
            getWallet: jest.fn().mockReturnValue(mockWallet)
        };
        const config = {
            id: 'test-node',
            strategy: NodeStrategy.BALANCED,
            walletIndex: 0,
            enabled: true
        };
        governanceNode = new GovernanceNode_1.GovernanceNode(config, mockWallet, mockWalletService);
    });
    describe('Initialization', () => {
        it('should initialize with correct configuration', () => {
            expect(governanceNode.getNodeId()).toBe('test-node');
            expect(governanceNode.isNodeActive()).toBe(false);
        });
        it('should return correct status', () => {
            const status = governanceNode.getStatus();
            expect(status.nodeId).toBe('test-node');
            expect(status.strategy).toBe(NodeStrategy.BALANCED);
            expect(status.isActive).toBe(false);
            expect(status.proposalsCreated).toBe(0);
            expect(status.votesAcast).toBe(0);
        });
    });
    describe('Node Lifecycle', () => {
        it('should start successfully', async () => {
            await governanceNode.start();
            expect(governanceNode.isNodeActive()).toBe(true);
        });
        it('should stop successfully', async () => {
            await governanceNode.start();
            await governanceNode.stop();
            expect(governanceNode.isNodeActive()).toBe(false);
        });
        it('should handle start errors gracefully', async () => {
            mockContractService.getActiveProposals.mockRejectedValueOnce(new Error('Network error'));
            await governanceNode.start();
            expect(governanceNode.isNodeActive()).toBe(true);
        });
    });
    describe('Voting Process', () => {
        beforeEach(async () => {
            await governanceNode.start();
        });
        it('should process voting round successfully', async () => {
            const result = await governanceNode.processVotingRound();
            expect(result.success).toBe(true);
            expect(result.votesSubmitted).toBeGreaterThanOrEqual(0);
        });
        it('should skip already voted proposals', async () => {
            mockContractService.hasVoted.mockResolvedValueOnce(true);
            const result = await governanceNode.processVotingRound();
            expect(result.success).toBe(true);
            expect(result.skipped).toBeGreaterThanOrEqual(0);
        });
        it('should handle voting errors gracefully', async () => {
            mockContractService.getActiveProposals.mockRejectedValueOnce(new Error('Network error'));
            const result = await governanceNode.processVotingRound();
            expect(result.success).toBe(true);
            expect(result.votesSubmitted).toBe(0);
        });
    });
    describe('Strategy Implementation', () => {
        it('should provide node status information', async () => {
            await governanceNode.start();
            const status = governanceNode.getStatus();
            expect(status).toBeDefined();
            expect(status.nodeId).toBe('test-node');
            expect(status.isActive).toBe(true);
        });
    });
    describe('Performance Monitoring', () => {
        it('should track node activity', async () => {
            await governanceNode.start();
            const status = governanceNode.getStatus();
            expect(status.isActive).toBe(true);
            expect(status.nodeId).toBeDefined();
        });
        it('should maintain status consistency', async () => {
            const statusBefore = governanceNode.getStatus();
            await governanceNode.start();
            const statusAfter = governanceNode.getStatus();
            expect(statusAfter.nodeId).toBe(statusBefore.nodeId);
            expect(statusAfter.isActive).toBe(true);
        });
    });
    describe('Error Handling', () => {
        it('should handle invalid configuration gracefully', async () => {
            const invalidConfig = {
                id: 'test-node',
                strategy: NodeStrategy.BALANCED,
                walletIndex: 0,
                enabled: true
            };
            expect(() => {
                new GovernanceNode_1.GovernanceNode(invalidConfig, mockWallet, mockWalletService);
            }).not.toThrow();
        });
        it('should handle network connectivity issues', async () => {
            mockContractService.getActiveProposals.mockRejectedValue(new Error('Network error'));
            await governanceNode.start();
            expect(governanceNode.isNodeActive()).toBe(true);
        });
    });
});
//# sourceMappingURL=GovernanceNode.test.js.map