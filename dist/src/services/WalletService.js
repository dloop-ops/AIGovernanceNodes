"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletService = void 0;
const ethers_1 = require("ethers");
const networks_1 = require("../config/networks");
const logger_1 = __importDefault(require("../utils/logger"));
const index_1 = require("../types/index");
class WalletService {
    constructor() {
        this.wallets = [];
        this.initializeProvider();
        this.loadWallets();
    }
    initializeProvider() {
        try {
            const network = (0, networks_1.getCurrentNetwork)();
            this.provider = new ethers_1.ethers.JsonRpcProvider(network.rpcUrl);
            logger_1.default.info(`Provider initialized for ${network.name}`);
        }
        catch (error) {
            if (process.env.NODE_ENV === 'test') {
                logger_1.default.info('Creating mock provider for test environment');
                return;
            }
            throw new index_1.GovernanceError('Failed to initialize wallet provider', 'PROVIDER_INIT_ERROR');
        }
    }
    loadWallets() {
        try {
            const privateKeys = [
                process.env.AI_NODE_1_PRIVATE_KEY,
                process.env.AI_NODE_2_PRIVATE_KEY,
                process.env.AI_NODE_3_PRIVATE_KEY,
                process.env.AI_NODE_4_PRIVATE_KEY,
                process.env.AI_NODE_5_PRIVATE_KEY
            ];
            for (let i = 0; i < privateKeys.length; i++) {
                const privateKey = privateKeys[i];
                if (!privateKey) {
                    if (process.env.NODE_ENV === 'development') {
                        logger_1.default.error(`❌ Missing environment variable: AI_NODE_${i + 1}_PRIVATE_KEY`);
                        logger_1.default.info(`💡 Please set the following environment variables:`);
                        logger_1.default.info(`   AI_NODE_1_PRIVATE_KEY=0x...`);
                        logger_1.default.info(`   AI_NODE_2_PRIVATE_KEY=0x...`);
                        logger_1.default.info(`   AI_NODE_3_PRIVATE_KEY=0x...`);
                        logger_1.default.info(`   AI_NODE_4_PRIVATE_KEY=0x...`);
                        logger_1.default.info(`   AI_NODE_5_PRIVATE_KEY=0x...`);
                        logger_1.default.info(`   ETHEREUM_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID`);
                    }
                    throw new index_1.GovernanceError(`Private key for AI Node ${i + 1} not found in environment variables`, 'MISSING_PRIVATE_KEY');
                }
                this.validatePrivateKeySecurity(privateKey, i + 1);
                let normalizedKey = privateKey.trim();
                if (!normalizedKey.startsWith('0x')) {
                    normalizedKey = '0x' + normalizedKey;
                }
                if (normalizedKey.length !== 66) {
                    throw new index_1.GovernanceError(`Invalid private key format for AI Node ${i + 1}. Expected 64 hex characters (with or without 0x prefix)`, 'INVALID_PRIVATE_KEY_FORMAT');
                }
                const wallet = new ethers_1.ethers.Wallet(normalizedKey, this.provider);
                this.wallets.push(wallet);
                logger_1.default.info(`Wallet loaded for AI Node ${i + 1}`, {
                    address: wallet.address,
                    nodeIndex: i
                });
            }
            logger_1.default.info(`Successfully loaded ${this.wallets.length} wallets`);
        }
        catch (error) {
            if (error instanceof index_1.GovernanceError) {
                throw error;
            }
            throw new index_1.GovernanceError(`Failed to load wallets: ${error instanceof Error ? error.message : String(error)}`, 'WALLET_LOAD_ERROR');
        }
    }
    validatePrivateKeySecurity(privateKey, nodeNumber) {
        const normalized = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
        const weakPatterns = [
            /^0+$/,
            /^1+$/,
            /^(0123456789abcdef)+$/i,
            /^(.)\1{10,}/
        ];
        for (const pattern of weakPatterns) {
            if (pattern.test(normalized)) {
                logger_1.default.warn(`Potentially weak private key detected for node ${nodeNumber}`);
                break;
            }
        }
        const uniqueChars = new Set(normalized.toLowerCase()).size;
        if (uniqueChars < 8) {
            logger_1.default.warn(`Low entropy private key detected for node ${nodeNumber} (${uniqueChars} unique characters)`);
        }
    }
    getWallet(nodeIndex) {
        if (nodeIndex < 0 || nodeIndex >= this.wallets.length) {
            throw new index_1.GovernanceError(`Invalid node index: ${nodeIndex}. Must be between 0 and ${this.wallets.length - 1}`, 'INVALID_NODE_INDEX');
        }
        return this.wallets[nodeIndex];
    }
    getWalletByAddress(address) {
        return this.wallets.find((wallet) => wallet.address.toLowerCase() === address.toLowerCase());
    }
    getAllAddresses() {
        return this.wallets.map((wallet) => wallet.address);
    }
    async getBalance(nodeIndex) {
        try {
            const wallet = this.getWallet(nodeIndex);
            const balance = await this.provider.getBalance(wallet.address);
            return ethers_1.ethers.formatEther(balance);
        }
        catch (error) {
            throw new index_1.GovernanceError(`Failed to get balance for node ${nodeIndex}: ${error instanceof Error ? error.message : String(error)}`, 'BALANCE_FETCH_ERROR');
        }
    }
    async getAllBalances() {
        const balances = [];
        for (let i = 0; i < this.wallets.length; i++) {
            try {
                const balance = await this.getBalance(i);
                balances.push({
                    nodeIndex: i,
                    address: this.wallets[i].address,
                    balance
                });
            }
            catch (error) {
                logger_1.default.error(`Failed to get balance for node ${i}`, { error });
                balances.push({
                    nodeIndex: i,
                    address: this.wallets[i].address,
                    balance: 'Error'
                });
            }
        }
        return balances;
    }
    async validateConnectivity() {
        try {
            const network = await this.provider.getNetwork();
            logger_1.default.info('Provider connectivity validated', {
                component: 'wallet',
                chainId: network.chainId,
                networkName: network.name
            });
            const testCount = Math.min(3, this.wallets.length);
            for (let i = 0; i < testCount; i++) {
                try {
                    const wallet = this.wallets[i];
                    const nonce = await wallet.getNonce();
                    logger_1.default.debug(`Wallet ${i} connectivity validated`, {
                        component: 'wallet',
                        address: wallet.address,
                        nonce: nonce.toString()
                    });
                }
                catch (walletError) {
                    let errorMessage = walletError instanceof Error ? walletError.message : String(walletError);
                    if (errorMessage.includes('BigInt') ||
                        (typeof walletError === 'object' && walletError !== null)) {
                        errorMessage = 'Wallet nonce check failed (network or serialization error)';
                    }
                    logger_1.default.warn(`Wallet ${i} connectivity test failed`, {
                        component: 'wallet',
                        error: errorMessage,
                        address: this.wallets[i].address
                    });
                    return false;
                }
            }
            logger_1.default.info('Wallet connectivity validation successful', {
                component: 'wallet',
                testedWallets: testCount,
                totalWallets: this.wallets.length
            });
            return true;
        }
        catch (error) {
            let errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes('BigInt')) {
                errorMessage = 'Wallet connectivity check failed due to serialization error';
            }
            logger_1.default.error('Wallet connectivity validation failed', {
                component: 'wallet',
                error: errorMessage,
                nodeAddress: this.wallets[0]?.address || 'unknown'
            });
            return false;
        }
    }
    getProvider() {
        return this.provider;
    }
    async estimateGas(nodeIndex, to, data, value) {
        try {
            const wallet = this.getWallet(nodeIndex);
            const tx = {
                to,
                data,
                value: value ? ethers_1.ethers.parseEther(value) : 0
            };
            return await wallet.estimateGas(tx);
        }
        catch (error) {
            throw new index_1.GovernanceError(`Failed to estimate gas: ${error instanceof Error ? error.message : String(error)}`, 'GAS_ESTIMATION_ERROR');
        }
    }
    async getGasPrice() {
        try {
            const feeData = await this.provider.getFeeData();
            return feeData.gasPrice || ethers_1.ethers.parseUnits('20', 'gwei');
        }
        catch (error) {
            logger_1.default.warn('Failed to get gas price, using fallback', { error });
            return ethers_1.ethers.parseUnits('20', 'gwei');
        }
    }
    isManaged(address) {
        return this.wallets.some((wallet) => wallet.address.toLowerCase() === address.toLowerCase());
    }
    getWalletCount() {
        return this.wallets.length;
    }
    getAllWallets() {
        return [...this.wallets];
    }
}
exports.WalletService = WalletService;
//# sourceMappingURL=WalletService.js.map