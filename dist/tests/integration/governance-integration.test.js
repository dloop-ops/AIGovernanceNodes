"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const WalletService_1 = require("../../src/services/WalletService");
const ContractService_1 = require("../../src/services/ContractService");
const GovernanceNode_1 = require("../../src/services/GovernanceNode");
const types_1 = require("../../src/types");
const NodeStrategyTest = {
    BALANCED: 'BALANCED',
    AGGRESSIVE: 'AGGRESSIVE',
    CONSERVATIVE: 'CONSERVATIVE'
};
describe('Governance Integration Tests', () => {
    let walletService;
    let contractService;
    let governanceNode;
    beforeAll(() => {
        if (!process.env.ETHEREUM_RPC_URL) {
            process.env.ETHEREUM_RPC_URL = 'https://ethereum-sepolia-rpc.publicnode.com';
        }
        global.testUtils.mockEnvironmentVariables();
    });
    afterAll(() => {
        global.testUtils.cleanupEnvironmentVariables();
    });
    describe('Service Integration', () => {
        it('should initialize all services successfully', async () => {
            expect(() => {
                walletService = new WalletService_1.WalletService();
            }).not.toThrow();
            expect(() => {
                contractService = new ContractService_1.ContractService(walletService);
            }).not.toThrow();
            expect(walletService.getWalletCount()).toBe(5);
        });
        it('should validate wallet and contract connectivity', async () => {
            walletService = new WalletService_1.WalletService();
            contractService = new ContractService_1.ContractService(walletService);
            const walletConnectivity = await walletService.validateConnectivity();
            expect(typeof walletConnectivity).toBe('boolean');
            const contractAddresses = contractService.getContractAddresses();
            expect(typeof contractAddresses).toBe('object');
        }, 30000);
    });
    describe('Governance Node Integration', () => {
        beforeEach(() => {
            walletService = new WalletService_1.WalletService();
            contractService = new ContractService_1.ContractService(walletService);
        });
        it('should create and initialize governance node', () => {
            const config = {
                id: 'test-node-1',
                strategy: types_1.NodeStrategy.BALANCED,
                walletIndex: 0,
                enabled: true
            };
            const wallet = walletService.getWallet(0);
            expect(() => {
                governanceNode = new GovernanceNode_1.GovernanceNode(config, wallet, walletService);
            }).not.toThrow();
            expect(governanceNode.getNodeId()).toBe('test-node-1');
            expect(governanceNode.isNodeActive()).toBe(false);
        });
        it('should start and stop governance node', async () => {
            const config = {
                id: 'test-node-1',
                strategy: types_1.NodeStrategy.BALANCED,
                walletIndex: 0,
                enabled: true
            };
            const wallet = walletService.getWallet(0);
            governanceNode = new GovernanceNode_1.GovernanceNode(config, wallet, walletService);
            await governanceNode.start();
            expect(governanceNode.isNodeActive()).toBe(true);
            await governanceNode.stop();
            expect(governanceNode.isNodeActive()).toBe(false);
        }, 15000);
    });
    describe('Multi-Node Coordination', () => {
        it('should handle multiple governance nodes', async () => {
            walletService = new WalletService_1.WalletService();
            const nodes = [];
            for (let i = 0; i < 3; i++) {
                const config = {
                    id: `test-node-${i + 1}`,
                    strategy: types_1.NodeStrategy.BALANCED,
                    walletIndex: i,
                    enabled: true
                };
                const wallet = walletService.getWallet(i);
                const node = new GovernanceNode_1.GovernanceNode(config, wallet, walletService);
                nodes.push(node);
            }
            expect(nodes.length).toBe(3);
            for (const node of nodes) {
                await node.start();
                expect(node.isNodeActive()).toBe(true);
            }
            for (const node of nodes) {
                await node.stop();
                expect(node.isNodeActive()).toBe(false);
            }
        }, 30000);
    });
    describe('Error Recovery', () => {
        it('should handle network failures gracefully', async () => {
            const originalRpcUrl = process.env.ETHEREUM_RPC_URL;
            process.env.ETHEREUM_RPC_URL = 'https://invalid-rpc-url.com';
            expect(() => {
                walletService = new WalletService_1.WalletService();
            }).not.toThrow();
            process.env.ETHEREUM_RPC_URL = originalRpcUrl;
        });
        it('should handle missing environment variables', () => {
            const originalValue = process.env.AI_NODE_1_PRIVATE_KEY;
            delete process.env.AI_NODE_1_PRIVATE_KEY;
            expect(() => {
                new WalletService_1.WalletService();
            }).toThrow();
            process.env.AI_NODE_1_PRIVATE_KEY = originalValue;
        });
    });
});
//# sourceMappingURL=governance-integration.test.js.map