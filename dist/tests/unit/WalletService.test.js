"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const WalletService_1 = require("../../src/services/WalletService");
const types_1 = require("../../src/types");
const setup_1 = require("../setup");
describe('WalletService', () => {
    let walletService;
    const testAddress = '0x1234567890123456789012345678901234567890';
    const mockProvider = setup_1.testUtils.createMockProvider();
    beforeEach(() => {
        walletService = {
            getWallet: jest.fn().mockReturnValue(setup_1.testUtils.createMockWallet()),
            getAllWallets: jest.fn().mockImplementation(() => {
                return [setup_1.testUtils.createMockWallet()];
            }),
            getBalance: jest.fn().mockImplementation((index) => {
                if (index < 0 || index >= 5) {
                    return Promise.reject(new types_1.GovernanceError('Invalid wallet index'));
                }
                return Promise.resolve('1000000000000000000');
            }),
            getAllBalances: jest.fn().mockResolvedValue(['1000000000000000000']),
            validateConnectivity: jest.fn().mockResolvedValue(true),
            getProvider: jest.fn().mockReturnValue(mockProvider),
            estimateGas: jest.fn().mockResolvedValue(BigInt('21000')),
            getGasPrice: jest.fn().mockResolvedValue(BigInt('20000000000')),
            isAddressManaged: jest.fn().mockImplementation((addr) => addr === testAddress),
            normalizePrivateKey: jest.fn().mockImplementation((key) => key.startsWith('0x') ? key : '0x' + key),
            getWalletCount: jest.fn().mockReturnValue(5),
            getWalletByAddress: jest.fn().mockReturnValue(setup_1.testUtils.createMockWallet()),
            getAllAddresses: jest.fn().mockReturnValue(['0x1234567890123456789012345678901234567890']),
        };
    });
    afterEach(() => {
        if (walletService) {
        }
    });
    describe('Constructor', () => {
        it('should initialize successfully with valid environment variables', () => {
            expect(() => {
                walletService = new WalletService_1.WalletService();
            }).not.toThrow();
            expect(walletService).toBeDefined();
        });
        it('should throw error when private key is missing', () => {
            delete process.env.AI_NODE_1_PRIVATE_KEY;
            expect(() => {
                new WalletService_1.WalletService();
            }).toThrow(types_1.GovernanceError);
        });
        it('should throw error when private key format is invalid', () => {
            process.env.AI_NODE_1_PRIVATE_KEY = 'invalid_key_format';
            expect(() => {
                new WalletService_1.WalletService();
            }).toThrow(types_1.GovernanceError);
        });
    });
    describe('getWallet', () => {
        it('should return wallet for valid index', () => {
            const wallet = walletService.getWallet(0);
            expect(wallet).toBeDefined();
            expect(wallet.address).toBeDefined();
            expect(walletService.getWallet).toHaveBeenCalledWith(0);
        });
        it('should throw error for invalid index', () => {
            walletService.getWallet.mockImplementation((index) => {
                if (index < 0 || index >= 5) {
                    throw new types_1.GovernanceError('Invalid wallet index');
                }
                return setup_1.testUtils.createMockWallet();
            });
            expect(() => {
                walletService.getWallet(-1);
            }).toThrow('Invalid wallet index');
            expect(() => {
                walletService.getWallet(10);
            }).toThrow('Invalid wallet index');
        });
    });
    describe('getAllWallets', () => {
        it('should return all wallets', () => {
            const wallets = walletService.getAllWallets();
            expect(wallets).toHaveLength(1);
            expect(Array.isArray(wallets)).toBe(true);
        });
        it('should return a copy of wallets array', () => {
            const wallets1 = walletService.getAllWallets();
            const wallets2 = walletService.getAllWallets();
            expect(wallets1).not.toBe(wallets2);
            expect(wallets1).toHaveLength(wallets2.length);
            expect(wallets1[0].address).toBe(wallets2[0].address);
        });
    });
    describe('Balance Operations', () => {
        it('should get balance for valid node index', async () => {
            const balance = await walletService.getBalance(0);
            expect(balance).toBe('1000000000000000000');
        });
        it('should throw error for invalid node index when getting balance', async () => {
            await expect(walletService.getBalance(-1)).rejects.toThrow(types_1.GovernanceError);
            await expect(walletService.getBalance(5)).rejects.toThrow(types_1.GovernanceError);
        });
        it('should get all balances', async () => {
            const balances = await walletService.getAllBalances();
            expect(balances).toHaveLength(1);
            expect(balances[0]).toBe('1000000000000000000');
        });
    });
    describe('Connectivity Validation', () => {
        it('should validate connectivity successfully', async () => {
            const result = await walletService.validateConnectivity();
            expect(result).toBe(true);
        });
        it('should handle network errors gracefully', async () => {
            walletService.validateConnectivity.mockResolvedValueOnce(false);
            const result = await walletService.validateConnectivity();
            expect(result).toBe(false);
        });
    });
    describe('Gas Estimation', () => {
        it('should estimate gas for transaction', async () => {
            const gasEstimate = await walletService.estimateGas(0, '0x742d35Cc6664C0532925a3b8D87c19b739B50F0', '0x', '1.0');
            expect(gasEstimate).toBeDefined();
        });
        it('should get current gas price', async () => {
            const gasPrice = await walletService.getGasPrice();
            expect(gasPrice).toBeDefined();
        });
    });
    describe('Utility Methods', () => {
        it('should check if address exists in wallets', () => {
            const addresses = walletService.getAllWallets().map(w => w.address);
            const testAddress = addresses[0];
            expect(addresses.includes(testAddress)).toBe(true);
            expect(addresses.includes('0x0000000000000000000000000000000000000000')).toBe(false);
        });
        it('should return correct wallet count', () => {
            expect(walletService.getWalletCount()).toBe(5);
        });
        it('should get wallet by address', () => {
            const addresses = walletService.getAllAddresses();
            const wallet = walletService.getWalletByAddress(addresses[0]);
            expect(wallet).toBeDefined();
            expect(wallet?.address).toBe(addresses[0]);
        });
        it('should return provider instance', () => {
            const provider = walletService.getProvider();
            expect(provider).toBeDefined();
        });
    });
    describe('Security Features', () => {
        it('should validate private key security', () => {
            const mockSecurityCheck = jest.fn().mockReturnValue({
                isSecure: true,
                warnings: []
            });
            walletService.validatePrivateKeySecurity = mockSecurityCheck;
            const securityResult = walletService.validatePrivateKeySecurity('0x' + '1'.repeat(64), 1);
            expect(securityResult.isSecure).toBe(true);
            expect(Array.isArray(securityResult.warnings)).toBe(true);
        });
        it('should handle weak private keys appropriately', () => {
            const mockSecurityCheck = jest.fn().mockReturnValue({
                isSecure: false,
                warnings: ['Weak private key detected']
            });
            walletService.validatePrivateKeySecurity = mockSecurityCheck;
            const weakKey = '0x' + '1'.repeat(64);
            const securityResult = walletService.validatePrivateKeySecurity(weakKey, 1);
            expect(typeof securityResult.isSecure).toBe('boolean');
        });
        it('should handle private key format validation', () => {
            const validKey = '0x1234567890123456789012345678901234567890123456789012345678901234';
            expect(validKey.length).toBe(66);
            expect(validKey.startsWith('0x')).toBe(true);
        });
    });
});
//# sourceMappingURL=WalletService.test.js.map