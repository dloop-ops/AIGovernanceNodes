"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const WalletService_1 = require("../../src/services/WalletService");
const types_1 = require("../../src/types");
// Mock environment variables
const mockEnvVars = {
    AI_NODE_1_PRIVATE_KEY: '0x' + '1'.repeat(64),
    AI_NODE_2_PRIVATE_KEY: '0x' + '2'.repeat(64),
    AI_NODE_3_PRIVATE_KEY: '0x' + '3'.repeat(64),
    AI_NODE_4_PRIVATE_KEY: '0x' + '4'.repeat(64),
    AI_NODE_5_PRIVATE_KEY: '0x' + '5'.repeat(64),
    ETHEREUM_RPC_URL: 'https://ethereum-sepolia-rpc.publicnode.com'
};
// Mock ethers
jest.mock('ethers', () => ({
    ethers: {
        JsonRpcProvider: jest.fn().mockImplementation(() => ({
            getNetwork: jest.fn().mockResolvedValue({ chainId: 11155111, name: 'sepolia' }),
            getBalance: jest.fn().mockResolvedValue(BigInt('1000000000000000000')) // 1 ETH
        })),
        Wallet: jest.fn().mockImplementation((privateKey, provider) => ({
            address: '0x' + privateKey.slice(2, 42),
            privateKey,
            provider,
            getNonce: jest.fn().mockResolvedValue(0)
        }))
    }
}));
describe('WalletService', () => {
    let walletService;
    beforeEach(() => {
        // Set up environment variables
        Object.assign(process.env, mockEnvVars);
    });
    afterEach(() => {
        // Clean up environment variables
        Object.keys(mockEnvVars).forEach(key => {
            delete process.env[key];
        });
    });
    describe('Constructor', () => {
        it('should initialize successfully with valid environment variables', () => {
            expect(() => {
                walletService = new WalletService_1.WalletService();
            }).not.toThrow();
        });
        it('should throw error when private key is missing', () => {
            delete process.env.AI_NODE_1_PRIVATE_KEY;
            expect(() => {
                new WalletService_1.WalletService();
            }).toThrow(types_1.GovernanceError);
        });
        it('should throw error when private key format is invalid', () => {
            process.env.AI_NODE_1_PRIVATE_KEY = 'invalid_key';
            expect(() => {
                new WalletService_1.WalletService();
            }).toThrow(types_1.GovernanceError);
        });
    });
    describe('getWallet', () => {
        beforeEach(() => {
            walletService = new WalletService_1.WalletService();
        });
        it('should return wallet for valid index', () => {
            const wallet = walletService.getWallet(0);
            expect(wallet).toBeDefined();
            expect(wallet.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
        });
        it('should throw error for invalid index', () => {
            expect(() => {
                walletService.getWallet(-1);
            }).toThrow(types_1.GovernanceError);
            expect(() => {
                walletService.getWallet(5);
            }).toThrow(types_1.GovernanceError);
        });
    });
    describe('getAllWallets', () => {
        beforeEach(() => {
            walletService = new WalletService_1.WalletService();
        });
        it('should return all wallets', () => {
            const wallets = walletService.getAllWallets();
            expect(wallets).toHaveLength(5);
            expect(Array.isArray(wallets)).toBe(true);
        });
        it('should return a copy of wallets array', () => {
            const wallets1 = walletService.getAllWallets();
            const wallets2 = walletService.getAllWallets();
            expect(wallets1).not.toBe(wallets2); // Different array instances
            expect(wallets1).toEqual(wallets2); // Same content
        });
    });
    describe('Security Features', () => {
        beforeEach(() => {
            walletService = new WalletService_1.WalletService();
        });
        it('should validate private key security', () => {
            // This test would check the private key validation logic
            // In a real test, we'd mock the logger to verify warnings are logged
            expect(() => {
                new WalletService_1.WalletService();
            }).not.toThrow();
        });
        it('should handle weak private keys appropriately', () => {
            // Test with a weak private key (all zeros)
            process.env.AI_NODE_1_PRIVATE_KEY = '0x' + '0'.repeat(64);
            // Should not throw but should log warning
            expect(() => {
                new WalletService_1.WalletService();
            }).not.toThrow();
        });
    });
});
//# sourceMappingURL=WalletService.test.js.map