"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnhancedNodeRegistration = void 0;
const ethers_1 = require("ethers");
const fs_1 = __importDefault(require("fs"));
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const TransactionManager_js_1 = require("./TransactionManager.js");
class EnhancedNodeRegistration {
    constructor(rpcManager, walletService) {
        this.contractABIs = new Map();
        this.rpcManager = rpcManager;
        this.transactionManager = new TransactionManager_js_1.TransactionManager(rpcManager);
        this.walletService = walletService;
        this.contractAddresses = {
            aiNodeRegistry: '0x0045c7D99489f1d8A5900243956B0206344417DD',
            dloopToken: '0x05B366778566e93abfB8e4A9B794e4ad006446b4',
            soulboundNft: '0x6391C14631b2Be5374297fA3110687b80233104c'
        };
        this.loadContractABIs();
    }
    async loadContractABIs() {
        try {
            const abiFiles = [
                { name: 'aiNodeRegistry', file: 'attached_assets/ainoderegistry.abi.v1.json' },
                { name: 'dloopToken', file: 'attached_assets/dlooptoken.abi.v1.json' },
                { name: 'soulboundNft', file: 'attached_assets/soulboundnft.abi.v1.json' }
            ];
            for (const { name, file } of abiFiles) {
                try {
                    const abiData = JSON.parse(fs_1.default.readFileSync(file, 'utf8'));
                    this.contractABIs.set(name, abiData.abi || abiData);
                    logger_js_1.default.info(`Loaded ABI for ${name}`, { file });
                }
                catch (error) {
                    logger_js_1.default.warn(`Failed to load ABI for ${name}`, { file, error: error.message });
                }
            }
        }
        catch (error) {
            logger_js_1.default.error('Failed to initialize contract ABIs', { error: error.message });
        }
    }
    async registerNodeWithComprehensiveFlow(config) {
        logger_js_1.default.info('Starting comprehensive node registration', {
            nodeId: config.nodeId,
            address: config.nodeAddress
        });
        try {
            const registrationStatus = await this.checkNodeRegistrationStatus(config.nodeAddress);
            if (registrationStatus.isRegistered) {
                logger_js_1.default.info('Node already registered', { nodeId: config.nodeId });
                return {
                    success: true,
                    isRegistered: true,
                    requirementsMet: true,
                    stakingComplete: true
                };
            }
            const tokenRequirements = await this.verifyTokenRequirements(config.nodeAddress);
            if (!tokenRequirements.sufficient) {
                logger_js_1.default.error('Insufficient DLOOP tokens for registration', {
                    nodeId: config.nodeId,
                    required: tokenRequirements.required,
                    available: tokenRequirements.available
                });
                return {
                    success: false,
                    isRegistered: false,
                    error: 'Insufficient DLOOP tokens',
                    requirementsMet: false
                };
            }
            const approvalResult = await this.approveTokensWithFallback(config);
            if (!approvalResult.success) {
                return {
                    success: false,
                    isRegistered: false,
                    error: `Token approval failed: ${approvalResult.error}`,
                    requirementsMet: false
                };
            }
            const registrationResult = await this.registerWithMultipleStrategies(config);
            if (registrationResult.success) {
                logger_js_1.default.info('Node registration completed successfully', {
                    nodeId: config.nodeId,
                    txHash: registrationResult.transactionHash
                });
                await this.delay(5000);
                const finalStatus = await this.checkNodeRegistrationStatus(config.nodeAddress);
                return {
                    success: true,
                    isRegistered: finalStatus.isRegistered,
                    transactionHash: registrationResult.transactionHash,
                    requirementsMet: true,
                    stakingComplete: true
                };
            }
            return {
                ...registrationResult,
                isRegistered: false
            };
        }
        catch (error) {
            logger_js_1.default.error('Comprehensive registration failed', {
                nodeId: config.nodeId,
                error: error.message
            });
            return {
                success: false,
                isRegistered: false,
                error: error.message,
                requirementsMet: false
            };
        }
    }
    async checkNodeRegistrationStatus(nodeAddress) {
        try {
            const abi = this.contractABIs.get('aiNodeRegistry');
            if (!abi) {
                throw new Error('AI Node Registry ABI not loaded');
            }
            const result = await this.transactionManager.executeContractRead(this.contractAddresses.aiNodeRegistry, abi, 'getNodeInfo', [nodeAddress]);
            return {
                isRegistered: true,
                nodeInfo: result
            };
        }
        catch (error) {
            if (error.message?.includes('NodeNotRegistered')) {
                return { isRegistered: false };
            }
            throw error;
        }
    }
    async verifyTokenRequirements(nodeAddress) {
        try {
            const wallet = this.walletService.getWalletByAddress(nodeAddress);
            if (!wallet) {
                throw new Error(`Wallet not found for address: ${nodeAddress}`);
            }
            const dloopAbi = this.contractABIs.get('dloopToken');
            if (!dloopAbi) {
                throw new Error('DLOOP Token ABI not loaded');
            }
            const balance = await this.transactionManager.executeContractRead(this.contractAddresses.dloopToken, dloopAbi, 'balanceOf', [nodeAddress]);
            const requiredAmount = ethers_1.ethers.parseEther('1.0');
            const availableAmount = BigInt(balance.toString());
            logger_js_1.default.debug('Token requirements verification', {
                nodeAddress,
                required: ethers_1.ethers.formatEther(requiredAmount),
                available: ethers_1.ethers.formatEther(availableAmount),
                sufficient: availableAmount >= requiredAmount
            });
            return {
                sufficient: availableAmount >= requiredAmount,
                required: ethers_1.ethers.formatEther(requiredAmount),
                available: ethers_1.ethers.formatEther(availableAmount)
            };
        }
        catch (error) {
            logger_js_1.default.error('Token requirements verification failed', {
                nodeAddress,
                error: error.message
            });
            return {
                sufficient: false,
                required: '1.0',
                available: '0.0'
            };
        }
    }
    async approveTokensWithFallback(config) {
        try {
            const wallet = this.walletService.getWalletByAddress(config.nodeAddress);
            if (!wallet) {
                throw new Error(`Wallet not found for address: ${config.nodeAddress}`);
            }
            const dloopAbi = this.contractABIs.get('dloopToken');
            if (!dloopAbi) {
                throw new Error('DLOOP Token ABI not loaded');
            }
            const approveAmount = ethers_1.ethers.parseEther('1.0');
            logger_js_1.default.info('Approving DLOOP tokens with enhanced gas handling', {
                nodeId: config.nodeId,
                amount: ethers_1.ethers.formatEther(approveAmount),
                spender: this.contractAddresses.aiNodeRegistry
            });
            const result = await this.transactionManager.executeTransaction(wallet, this.contractAddresses.dloopToken, dloopAbi, 'approve', [this.contractAddresses.aiNodeRegistry, approveAmount], {
                gasLimit: '100000',
                retries: 5,
                timeout: 60000
            });
            if (result.success) {
                logger_js_1.default.info('Token approval successful', {
                    nodeId: config.nodeId,
                    txHash: result.transactionHash,
                    gasUsed: result.gasUsed
                });
                return {
                    success: true,
                    transactionHash: result.transactionHash
                };
            }
            return {
                success: false,
                error: result.error
            };
        }
        catch (error) {
            logger_js_1.default.error('Token approval failed', {
                nodeId: config.nodeId,
                error: error.message
            });
            return {
                success: false,
                error: error.message
            };
        }
    }
    async registerWithMultipleStrategies(config) {
        const strategies = [
            () => this.registerWithStakingMethod(config),
            () => this.registerWithSafeApprovalMethod(config),
            () => this.registerWithOptimizedApprovalMethod(config)
        ];
        let lastError = '';
        for (let i = 0; i < strategies.length; i++) {
            const strategyName = ['Staking', 'SafeApproval', 'OptimizedApproval'][i];
            try {
                logger_js_1.default.info(`Attempting registration strategy: ${strategyName}`, {
                    nodeId: config.nodeId,
                    attempt: i + 1
                });
                const result = await strategies[i]();
                if (result.success) {
                    logger_js_1.default.info(`Registration successful with ${strategyName} strategy`, {
                        nodeId: config.nodeId,
                        txHash: result.transactionHash
                    });
                    return result;
                }
                lastError = result.error || `${strategyName} strategy failed`;
                logger_js_1.default.warn(`${strategyName} strategy failed, trying next`, {
                    nodeId: config.nodeId,
                    error: lastError
                });
            }
            catch (error) {
                lastError = error.message;
                logger_js_1.default.warn(`${strategyName} strategy exception, trying next`, {
                    nodeId: config.nodeId,
                    error: error.message
                });
            }
            if (i < strategies.length - 1) {
                await this.delay(2000);
            }
        }
        return {
            success: false,
            error: `All registration strategies failed. Last error: ${lastError}`
        };
    }
    async registerWithStakingMethod(config) {
        const wallet = this.walletService.getWalletByAddress(config.nodeAddress);
        if (!wallet) {
            throw new Error(`Wallet not found for address: ${config.nodeAddress}`);
        }
        const abi = this.contractABIs.get('aiNodeRegistry');
        if (!abi) {
            throw new Error('AI Node Registry ABI not loaded');
        }
        const metadata = JSON.stringify({
            name: config.nodeName,
            description: `Automated governance node using ${config.nodeType} strategy`,
            endpoint: config.endpoint,
            nodeType: config.nodeType,
            strategy: config.nodeType.toLowerCase(),
            version: '1.0.0',
            registeredAt: Date.now()
        });
        return await this.transactionManager.executeTransaction(wallet, this.contractAddresses.aiNodeRegistry, abi, 'registerNodeWithStaking', [config.nodeAddress, metadata, 0], {
            gasLimit: '1000000',
            retries: 3,
            timeout: 120000
        });
    }
    async registerWithSafeApprovalMethod(config) {
        const wallet = this.walletService.getWalletByAddress(config.nodeAddress);
        if (!wallet) {
            throw new Error(`Wallet not found for address: ${config.nodeAddress}`);
        }
        const abi = this.contractABIs.get('aiNodeRegistry');
        if (!abi) {
            throw new Error('AI Node Registry ABI not loaded');
        }
        return await this.transactionManager.executeTransaction(wallet, this.contractAddresses.aiNodeRegistry, abi, 'registerNodeWithSafeApproval', [], {
            gasLimit: '800000',
            retries: 3,
            timeout: 120000
        });
    }
    async registerWithOptimizedApprovalMethod(config) {
        const wallet = this.walletService.getWalletByAddress(config.nodeAddress);
        if (!wallet) {
            throw new Error(`Wallet not found for address: ${config.nodeAddress}`);
        }
        const abi = this.contractABIs.get('aiNodeRegistry');
        if (!abi) {
            throw new Error('AI Node Registry ABI not loaded');
        }
        return await this.transactionManager.executeTransaction(wallet, this.contractAddresses.aiNodeRegistry, abi, 'registerNodeWithOptimizedApproval', [], {
            gasLimit: '700000',
            retries: 3,
            timeout: 120000
        });
    }
    async batchRegisterNodes(configs) {
        const successful = [];
        const failed = [];
        logger_js_1.default.info('Starting batch node registration', {
            totalNodes: configs.length
        });
        for (const config of configs) {
            try {
                const result = await this.registerNodeWithComprehensiveFlow(config);
                if (result.success) {
                    successful.push(config.nodeId);
                    logger_js_1.default.info('Batch registration success', {
                        nodeId: config.nodeId,
                        txHash: result.transactionHash
                    });
                }
                else {
                    failed.push({
                        nodeId: config.nodeId,
                        error: result.error || 'Unknown error'
                    });
                }
                await this.delay(3000);
            }
            catch (error) {
                failed.push({
                    nodeId: config.nodeId,
                    error: error.message
                });
                logger_js_1.default.error('Batch registration error', {
                    nodeId: config.nodeId,
                    error: error.message
                });
            }
        }
        logger_js_1.default.info('Batch registration completed', {
            successful: successful.length,
            failed: failed.length,
            totalProcessed: configs.length
        });
        return {
            successful,
            failed,
            totalProcessed: configs.length
        };
    }
    delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
exports.EnhancedNodeRegistration = EnhancedNodeRegistration;
//# sourceMappingURL=EnhancedNodeRegistration.js.map