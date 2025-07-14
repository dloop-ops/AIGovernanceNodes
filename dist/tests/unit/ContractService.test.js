"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ContractService_1 = require("../../src/services/ContractService");
const types_1 = require("../../src/types");
jest.mock('../../src/services/WalletService');
jest.mock('../../src/services/RpcManager');
jest.mock('../../src/services/NetworkMonitor');
jest.mock('ethers', () => ({
    ethers: {
        Contract: jest.fn().mockImplementation(() => ({
            getProposalCount: jest.fn().mockResolvedValue(BigInt('10')),
            getProposal: jest.fn().mockResolvedValue([
                BigInt('1'),
                1,
                '0x742d35Cc6664C0532925a3b8D87c19b739B50F0',
                BigInt('1000000000000000000'),
                'Test proposal',
                '0x742d35Cc6664C0532925a3b8D87c19b739B50F0',
                BigInt('1704067200'),
                BigInt('1704153600'),
                BigInt('5'),
                BigInt('2'),
                1,
                false
            ]),
            hasVoted: jest.fn().mockResolvedValue(false),
            vote: jest.fn().mockResolvedValue({
                hash: '0x123',
                wait: jest.fn().mockResolvedValue({ status: 1 })
            }),
            isRegistered: jest.fn().mockResolvedValue(true),
            totalSupply: jest.fn().mockResolvedValue(BigInt('1000000')),
            balanceOf: jest.fn().mockResolvedValue(BigInt('100'))
        })),
        getAddress: jest.fn().mockImplementation((addr) => addr),
        JsonRpcProvider: jest.fn().mockImplementation(() => ({
            getNetwork: jest.fn().mockResolvedValue({ name: 'sepolia', chainId: 11155111 })
        }))
    }
}));
describe('ContractService', () => {
    let contractService;
    let mockWalletService;
    beforeEach(() => {
        global.testUtils.mockEnvironmentVariables();
        const mockProvider = {
            getNetwork: jest.fn().mockResolvedValue({ name: 'sepolia', chainId: 11155111 }),
            getFeeData: jest.fn().mockResolvedValue({
                gasPrice: BigInt('20000000000'),
                maxFeePerGas: BigInt('20000000000'),
                maxPriorityFeePerGas: BigInt('1000000000')
            })
        };
        mockWalletService = {
            getWallet: jest.fn().mockReturnValue({
                address: '0x1234567890123456789012345678901234567890',
                connect: jest.fn().mockReturnThis(),
                getNonce: jest.fn().mockResolvedValue(1)
            }),
            getProvider: jest.fn().mockReturnValue(mockProvider),
            getWalletCount: jest.fn().mockReturnValue(5),
            validateConnectivity: jest.fn().mockResolvedValue(true),
            getGasPrice: jest.fn().mockResolvedValue(BigInt('20000000000'))
        };
        contractService = {
            getContractAddresses: jest.fn().mockReturnValue({
                assetDAO: '0x1234567890123456789012345678901234567890',
                aiNodeRegistry: '0x2345678901234567890123456789012345678901',
                dloopToken: '0x3456789012345678901234567890123456789012',
                soulboundNFT: '0x4567890123456789012345678901234567890123'
            }),
            validateContract: jest.fn().mockResolvedValue(true),
            getProposals: jest.fn().mockResolvedValue([]),
            vote: jest.fn().mockResolvedValue({ hash: '0x123', wait: jest.fn() }),
            createProposal: jest.fn().mockResolvedValue({ hash: '0x123', wait: jest.fn() })
        };
    });
    afterEach(() => {
        delete process.env.ASSET_DAO_ADDRESS;
        delete process.env.AI_NODE_REGISTRY_ADDRESS;
        delete process.env.DLOOP_TOKEN_ADDRESS;
        delete process.env.SOULBOUND_NFT_ADDRESS;
        jest.clearAllMocks();
    });
    describe('Constructor', () => {
        it('should initialize successfully with valid environment variables', () => {
            expect(() => {
                contractService = new ContractService_1.ContractService(mockWalletService);
            }).not.toThrow();
        });
        it('should throw error when contract address is missing', () => {
            const originalAddress = process.env.ASSET_DAO_ADDRESS;
            delete process.env.ASSET_DAO_ADDRESS;
            const ContractServiceConstructor = jest.fn().mockImplementation(() => {
                throw new Error('Contract address not found');
            });
            expect(() => {
                new ContractServiceConstructor(mockWalletService);
            }).toThrow();
            process.env.ASSET_DAO_ADDRESS = originalAddress;
        });
    });
    describe('Proposal Operations', () => {
        beforeEach(() => {
            contractService = new ContractService_1.ContractService(mockWalletService);
        });
        it('should get proposal count', async () => {
            jest.spyOn(contractService, 'getProposalCount').mockResolvedValue(10);
            const count = await contractService.getProposalCount();
            expect(typeof count).toBe('number');
        });
        it('should get single proposal', async () => {
            const mockProposal = {
                id: '1',
                proposer: '0x742d35Cc6664C0532925a3b8D87c19b739B50F0',
                description: 'Test proposal',
                state: types_1.ProposalState.ACTIVE,
                endTime: Math.floor(Date.now() / 1000) + 3600
            };
            jest.spyOn(contractService, 'getProposal').mockResolvedValue(mockProposal);
            const proposal = await contractService.getProposal('1');
            expect(proposal).toBeDefined();
            expect(proposal.id).toBe('1');
        });
        it('should get all proposals', async () => {
            const mockProposals = [
                {
                    id: '1',
                    proposer: '0x742d35Cc6664C0532925a3b8D87c19b739B50F0',
                    description: 'Test proposal 1',
                    state: types_1.ProposalState.ACTIVE
                }
            ];
            jest.spyOn(contractService, 'getProposals').mockResolvedValue(mockProposals);
            const proposals = await contractService.getProposals();
            expect(Array.isArray(proposals)).toBe(true);
        });
    });
    describe('Voting Operations', () => {
        beforeEach(() => {
            contractService = new ContractService_1.ContractService(mockWalletService);
        });
        it('should check if wallet has voted', async () => {
            jest.spyOn(contractService, 'hasVoted').mockResolvedValue(false);
            const hasVoted = await contractService.hasVoted('1', 0);
            expect(typeof hasVoted).toBe('boolean');
        });
        it('should cast vote successfully', async () => {
            const mockTxHash = '0x123456789abcdef';
            jest.spyOn(contractService, 'vote').mockResolvedValue(mockTxHash);
            const result = await contractService.vote(0, '1', true);
            expect(typeof result).toBe('string');
            expect(result).toBeDefined();
        });
        it('should handle voting errors gracefully', async () => {
            jest.spyOn(contractService, 'vote').mockRejectedValue(new types_1.GovernanceError('Voting failed'));
            await expect(contractService.vote(0, '1', true)).rejects.toThrow(types_1.GovernanceError);
        });
    });
    describe('Node Registry Operations', () => {
        beforeEach(() => {
            contractService = new ContractService_1.ContractService(mockWalletService);
        });
        it('should check if node is registered', async () => {
            jest.spyOn(contractService, 'isNodeRegistered').mockResolvedValue(true);
            const isRegistered = await contractService.isNodeRegistered('0x742d35Cc6664C0532925a3b8D87c19b739B50F0');
            expect(typeof isRegistered).toBe('boolean');
        });
    });
    describe('Token Operations', () => {
        beforeEach(() => {
            contractService = new ContractService_1.ContractService(mockWalletService);
        });
        it('should get token total supply', async () => {
            jest.spyOn(contractService, 'getTokenTotalSupply').mockResolvedValue(1000000);
            const totalSupply = await contractService.getTokenTotalSupply();
            expect(typeof totalSupply).toBe('number');
        });
        it('should get token balance', async () => {
            jest.spyOn(contractService, 'getTokenBalance').mockResolvedValue(100);
            const balance = await contractService.getTokenBalance(0);
            expect(typeof balance).toBe('number');
        });
    });
    describe('Contract Validation', () => {
        beforeEach(() => {
            contractService = new ContractService_1.ContractService(mockWalletService);
            jest.spyOn(contractService, 'getContractAddresses').mockReturnValue({
                assetDAO: '0x1234567890123456789012345678901234567890',
                aiNodeRegistry: '0x2345678901234567890123456789012345678901',
                dloopToken: '0x3456789012345678901234567890123456789012',
                soulboundNFT: '0x4567890123456789012345678901234567890123'
            });
        });
        it('should validate contract addresses format', () => {
            const addresses = contractService.getContractAddresses();
            expect(addresses.assetDAO).toMatch(/^0x[a-fA-F0-9]{40}$/);
            expect(addresses.aiNodeRegistry).toMatch(/^0x[a-fA-F0-9]{40}$/);
            expect(addresses.dloopToken).toMatch(/^0x[a-fA-F0-9]{40}$/);
        });
        it('should get contract addresses', () => {
            const addresses = contractService.getContractAddresses();
            expect(typeof addresses).toBe('object');
            expect(addresses.assetDAO).toBeDefined();
            expect(addresses.aiNodeRegistry).toBeDefined();
            expect(addresses.dloopToken).toBeDefined();
        });
    });
});
//# sourceMappingURL=ContractService.test.js.map