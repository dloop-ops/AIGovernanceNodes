import { WalletService } from '../../src/services/WalletService';
import { ContractService } from '../../src/services/ContractService';
import { GovernanceNode } from '../../src/services/GovernanceNode';
import { NodeStrategy } from '../../src/types';

// Define NodeStrategy for tests
const NodeStrategyTest = {
  BALANCED: 'BALANCED',
  AGGRESSIVE: 'AGGRESSIVE', 
  CONSERVATIVE: 'CONSERVATIVE'
} as const;

// This test requires real environment variables to be set
describe('Governance Integration Tests', () => {
  let walletService: WalletService;
  let contractService: ContractService;
  let governanceNode: GovernanceNode;

  beforeAll(() => {
    // Set up test environment variables if not already set
    if (!process.env.ETHEREUM_RPC_URL) {
      process.env.ETHEREUM_RPC_URL = 'https://ethereum-sepolia-rpc.publicnode.com';
    }

    // Use test environment variables
    global.testUtils.mockEnvironmentVariables();
  });

  afterAll(() => {
    global.testUtils.cleanupEnvironmentVariables();
  });

  describe('Service Integration', () => {
    it('should initialize all services successfully', async () => {
      expect(() => {
        walletService = new WalletService();
      }).not.toThrow();

      expect(() => {
        contractService = new ContractService(walletService);
      }).not.toThrow();

      expect(walletService.getWalletCount()).toBe(5);
    });

    it('should validate wallet and contract connectivity', async () => {
      walletService = new WalletService();
      contractService = new ContractService(walletService);

      // Test wallet connectivity
      const walletConnectivity = await walletService.validateConnectivity();
      expect(typeof walletConnectivity).toBe('boolean');

      // Test contract connectivity - using a basic method that exists
      const contractAddresses = contractService.getContractAddresses();
      expect(typeof contractAddresses).toBe('object');
    }, 30000);
  });

  describe('Governance Node Integration', () => {
    beforeEach(() => {
      walletService = new WalletService();
      contractService = new ContractService(walletService);
    });

    it('should create and initialize governance node', () => {
      const config = {
        id: 'test-node-1',
        strategy: NodeStrategy.BALANCED,
        walletIndex: 0,
        enabled: true
      };

      const wallet = walletService.getWallet(0);

      expect(() => {
        governanceNode = new GovernanceNode(config, wallet, walletService);
      }).not.toThrow();

      expect(governanceNode.getNodeId()).toBe('test-node-1');
      expect(governanceNode.isNodeActive()).toBe(false);
    });

    it('should start and stop governance node', async () => {
      const config = {
        id: 'test-node-1',
        strategy: NodeStrategy.BALANCED,
        walletIndex: 0,
        enabled: true
      };

      const wallet = walletService.getWallet(0);
      governanceNode = new GovernanceNode(config, wallet, walletService);

      // Start node
      await governanceNode.start();
      expect(governanceNode.isNodeActive()).toBe(true);

      // Stop node
      await governanceNode.stop();
      expect(governanceNode.isNodeActive()).toBe(false);
    }, 15000);
  });

  describe('Multi-Node Coordination', () => {
    it('should handle multiple governance nodes', async () => {
      walletService = new WalletService();
      const nodes: GovernanceNode[] = [];

      // Create multiple nodes
      for (let i = 0; i < 3; i++) {
        const config = {
          id: `test-node-${i + 1}`,
          strategy: NodeStrategy.BALANCED,
          walletIndex: i,
          enabled: true
        };

        const wallet = walletService.getWallet(i);
        const node = new GovernanceNode(config, wallet, walletService);
        nodes.push(node);
      }

      expect(nodes.length).toBe(3);

      // Start all nodes
      for (const node of nodes) {
        await node.start();
        expect(node.isNodeActive()).toBe(true);
      }

      // Stop all nodes
      for (const node of nodes) {
        await node.stop();
        expect(node.isNodeActive()).toBe(false);
      }
    }, 30000);
  });

  describe('Error Recovery', () => {
    it('should handle network failures gracefully', async () => {
      // Test with invalid RPC URL
      const originalRpcUrl = process.env.ETHEREUM_RPC_URL;
      process.env.ETHEREUM_RPC_URL = 'https://invalid-rpc-url.com';

      // Network failures should not prevent service initialization
      // but should be handled gracefully during network operations
      expect(() => {
        walletService = new WalletService();
      }).not.toThrow();

      // Restore valid RPC URL
      process.env.ETHEREUM_RPC_URL = originalRpcUrl;
    });

    it('should handle missing environment variables', () => {
      // Remove required environment variable
      const originalValue = process.env.AI_NODE_1_PRIVATE_KEY;
      delete process.env.AI_NODE_1_PRIVATE_KEY;

      expect(() => {
        new WalletService();
      }).toThrow();

      // Restore environment variable
      process.env.AI_NODE_1_PRIVATE_KEY = originalValue;
    });
  });
});