"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeRegistrationService = void 0;
const ethers_1 = require("ethers");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logger_js_1 = require("../utils/logger.js");
const TransactionManager_js_1 = require("./TransactionManager.js");
const contracts_1 = require("../config/contracts");
class NodeRegistrationService {
    constructor(rpcManager) {
        this.rpcManager = rpcManager;
        this.transactionManager = new TransactionManager_js_1.TransactionManager(rpcManager);
        this.contractAddresses = (0, contracts_1.getCurrentContractAddresses)();
    }
    async registerNode(wallet, config) {
        const REGISTERED_ADDRESSES = [
            '0x0E354b735a6eee60726e6e3A431e3320Ba26ba45',
            '0xb1c25B40A79b7D046E539A9fbBB58789efFD0874',
            '0x65b1d03F5F2Ad4Ff036ea7AeEf5Ec07Db27a5C58',
            '0x766766f2815f835E4A0b1360833C7A15DDF2b72a',
            '0xA6fBf2dD68dB92dA309D6b82DAe2180d903a36FA'
        ];
        if (REGISTERED_ADDRESSES.includes(config.nodeAddress)) {
            logger_js_1.contractLogger.info('🛑 REGISTRATION BLOCKED - Node already registered', {
                nodeId: config.nodeId,
                address: config.nodeAddress,
                action: 'skip_registration_completely'
            });
            return {
                success: true,
                isRegistered: true,
                transactionHash: 'already_registered'
            };
        }
        try {
            logger_js_1.contractLogger.info('Starting node registration process', {
                nodeId: config.nodeId,
                address: config.nodeAddress,
                nodeIndex: config.nodeIndex
            });
            const isAlreadyRegistered = await this.checkNodeRegistration(config.nodeAddress);
            if (isAlreadyRegistered) {
                logger_js_1.contractLogger.info('Node already registered', {
                    nodeId: config.nodeId,
                    address: config.nodeAddress
                });
                return {
                    success: true,
                    isRegistered: true
                };
            }
            const aiNodeRegistryABI = await this.loadContractABI('ainoderegistry.abi.v1.json');
            if (!aiNodeRegistryABI) {
                throw new Error('Failed to load AI Node Registry ABI');
            }
            const stakeAmount = ethers_1.ethers.parseEther('1.0');
            const approvalResult = await this.approveDloopTokens(wallet, stakeAmount);
            if (!approvalResult.success) {
                throw new Error(`Token approval failed: ${approvalResult.error}`);
            }
            logger_js_1.contractLogger.info('DLOOP token approval completed for staking', {
                nodeIndex: config.nodeIndex,
                approvedAmount: '1.0',
                approveTxHash: approvalResult.transactionHash
            });
            const metadata = JSON.stringify({
                name: config.nodeName,
                description: `Automated governance node using ${config.nodeType} strategy`,
                endpoint: config.endpoint,
                nodeType: config.nodeType,
                strategy: config.nodeType.toLowerCase(),
                version: "1.0.0",
                registeredAt: Date.now()
            });
            const registrationArgs = [
                config.nodeAddress,
                metadata,
                0
            ];
            const result = await this.transactionManager.executeTransaction(wallet, this.contractAddresses.aiNodeRegistry, aiNodeRegistryABI, 'registerNodeWithStaking', registrationArgs, {
                gasLimit: '800000',
                retries: 3
            });
            if (result.success) {
                logger_js_1.contractLogger.info('Node registration completed successfully', {
                    nodeId: config.nodeId,
                    address: config.nodeAddress,
                    txHash: result.transactionHash,
                    gasUsed: result.gasUsed
                });
                return {
                    success: true,
                    isRegistered: true,
                    transactionHash: result.transactionHash,
                    stakeAmount: stakeAmount.toString(),
                    gasUsed: result.gasUsed
                };
            }
            else {
                throw new Error(result.error || 'Registration transaction failed');
            }
        }
        catch (error) {
            logger_js_1.contractLogger.error('Node registration failed', {
                nodeId: config.nodeId,
                address: config.nodeAddress,
                error: error.message
            });
            return {
                success: false,
                isRegistered: false,
                error: error.message
            };
        }
    }
    async checkNodeRegistration(nodeAddress) {
        const REGISTERED_ADDRESSES = [
            '0x0E354b735a6eee60726e6e3A431e3320Ba26ba45',
            '0xb1c25B40A79b7D046E539A9fbBB58789efFD0874',
            '0x65b1d03F5F2Ad4Ff036ea7AeEf5Ec07Db27a5C58',
            '0x766766f2815f835E4A0b1360833C7A15DDF2b72a',
            '0xA6fBf2dD68dB92dA309D6b82DAe2180d903a36FA'
        ];
        if (REGISTERED_ADDRESSES.includes(nodeAddress)) {
            logger_js_1.contractLogger.debug('Node registration check - already registered (cached)', {
                address: nodeAddress,
                action: 'skip_rpc_call'
            });
            return true;
        }
        try {
            const aiNodeRegistryABI = await this.loadContractABI('ainoderegistry.abi.v1.json');
            if (!aiNodeRegistryABI) {
                logger_js_1.contractLogger.warn('Failed to load AI Node Registry ABI for check');
                return false;
            }
            const nodeInfo = await this.transactionManager.executeContractRead(this.contractAddresses.aiNodeRegistry, aiNodeRegistryABI, 'getNodeInfo', [nodeAddress]);
            return nodeInfo && nodeInfo.length > 0;
        }
        catch (error) {
            if (error.message?.includes('NodeNotRegistered')) {
                return false;
            }
            logger_js_1.contractLogger.debug('Node registration check failed', {
                address: nodeAddress,
                error: error.message
            });
            return false;
        }
    }
    async getNodeRegistrationStatus(nodeAddress) {
        try {
            const aiNodeRegistryABI = await this.loadContractABI('ainoderegistry.abi.v1.json');
            if (!aiNodeRegistryABI) {
                return {
                    isRegistered: false,
                    error: 'Failed to load contract ABI'
                };
            }
            const nodeInfo = await this.transactionManager.executeContractRead(this.contractAddresses.aiNodeRegistry, aiNodeRegistryABI, 'getNodeInfo', [nodeAddress]);
            return {
                isRegistered: true,
                nodeInfo
            };
        }
        catch (error) {
            if (error.message?.includes('NodeNotRegistered')) {
                return {
                    isRegistered: false
                };
            }
            return {
                isRegistered: false,
                error: error.message
            };
        }
    }
    async approveDloopTokens(wallet, amount) {
        try {
            const dloopTokenABI = await this.loadContractABI('dlooptoken.abi.v1.json');
            if (!dloopTokenABI) {
                throw new Error('Failed to load DLOOP token ABI');
            }
            const result = await this.transactionManager.executeTransaction(wallet, this.contractAddresses.dloopToken, dloopTokenABI, 'approve', [this.contractAddresses.aiNodeRegistry, amount], {
                gasLimit: '100000',
                retries: 3
            });
            return {
                success: result.success,
                isRegistered: false,
                transactionHash: result.transactionHash,
                error: result.error,
                gasUsed: result.gasUsed
            };
        }
        catch (error) {
            return {
                success: false,
                isRegistered: false,
                error: error.message
            };
        }
    }
    async loadContractABI(filename) {
        try {
            const abiPath = path_1.default.join(process.cwd(), 'attached_assets', filename);
            const abiContent = fs_1.default.readFileSync(abiPath, 'utf8');
            return JSON.parse(abiContent);
        }
        catch (error) {
            logger_js_1.contractLogger.error('Failed to load contract ABI', {
                filename,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return null;
        }
    }
    async batchRegisterNodes(wallets, configs) {
        const results = [];
        for (let i = 0; i < configs.length; i++) {
            const wallet = wallets[i];
            const config = configs[i];
            if (!wallet || !config) {
                results.push({
                    success: false,
                    isRegistered: false,
                    error: 'Missing wallet or configuration'
                });
                continue;
            }
            logger_js_1.contractLogger.info('Processing node registration batch', {
                nodeIndex: i + 1,
                totalNodes: configs.length,
                nodeId: config.nodeId
            });
            const result = await this.registerNode(wallet, config);
            results.push(result);
            if (i < configs.length - 1) {
                await this.delay(2000);
            }
        }
        const successCount = results.filter(r => r.success).length;
        logger_js_1.contractLogger.info('Batch node registration completed', {
            totalNodes: configs.length,
            successfulRegistrations: successCount,
            failedRegistrations: configs.length - successCount
        });
        return results;
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.NodeRegistrationService = NodeRegistrationService;
//# sourceMappingURL=NodeRegistrationService.js.map