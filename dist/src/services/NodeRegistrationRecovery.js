"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeRegistrationRecovery = void 0;
const ethers_1 = require("ethers");
const fs_1 = __importDefault(require("fs"));
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const TransactionManager_js_1 = require("./TransactionManager.js");
class NodeRegistrationRecovery {
    constructor(rpcManager, walletService) {
        this.registrationStatuses = new Map();
        this.contractABIs = new Map();
        this.rpcManager = rpcManager;
        this.transactionManager = new TransactionManager_js_1.TransactionManager(rpcManager);
        this.walletService = walletService;
        this.contractAddresses = {
            aiNodeRegistry: '0x0045c7D99489f1d8A5900243956B0206344417DD',
            dloopToken: '0x05B366778566e93abfB8e4A9B794e4ad006446b4',
            soulboundNft: '0x6391C14631b2Be5374297fA3110687b80233104c'
        };
        this.initializeRecoverySystem();
    }
    async initializeRecoverySystem() {
        try {
            await this.loadContractABIs();
            await this.scanUnregisteredNodes();
            logger_js_1.default.info('Node registration recovery system initialized', {
                unregisteredNodes: this.registrationStatuses.size
            });
        }
        catch (error) {
            logger_js_1.default.error('Failed to initialize recovery system', { error: error.message });
        }
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
                    logger_js_1.default.debug(`Contract ABI loaded: ${name}`);
                }
                catch (error) {
                    logger_js_1.default.warn(`Failed to load ABI: ${name}`, { file, error: error.message });
                }
            }
        }
        catch (error) {
            logger_js_1.default.error('ABI loading failed', { error: error.message });
        }
    }
    async scanUnregisteredNodes() {
        const nodeConfigs = [
            { nodeId: 'ai-gov-01', address: '0x0E354b735a6eee60726e6e3A431e3320Ba26ba45' },
            { nodeId: 'ai-gov-02', address: '0x48B2353954496679CF7C73d239bc12098cB0C5B4' },
            { nodeId: 'ai-gov-03', address: '0x43f76157E9696302E287181828cB3B0C6B89d31e' },
            { nodeId: 'ai-gov-04', address: '0xC02764913ce2F23B094F0338a711EFD984024A46' },
            { nodeId: 'ai-gov-05', address: '0x00FfF703fa6837A1a46b3DF9B6a047404046379E' }
        ];
        for (const config of nodeConfigs) {
            try {
                const status = await this.checkNodeRegistrationStatus(config.nodeId, config.address);
                if (!status.isRegistered) {
                    this.registrationStatuses.set(config.nodeId, status);
                    logger_js_1.default.info('Unregistered node detected', {
                        nodeId: config.nodeId,
                        address: config.address,
                        hasTokens: status.hasTokens
                    });
                }
            }
            catch (error) {
                logger_js_1.default.warn('Failed to check node status', {
                    nodeId: config.nodeId,
                    error: error.message
                });
            }
        }
    }
    async checkNodeRegistrationStatus(nodeId, address) {
        const status = {
            nodeId,
            address,
            isRegistered: false,
            hasTokens: false,
            isApproved: false,
            canStake: false,
            lastAttempt: 0,
            attemptCount: 0,
            status: 'pending'
        };
        try {
            const abi = this.contractABIs.get('aiNodeRegistry');
            if (abi) {
                try {
                    await this.transactionManager.executeContractRead(this.contractAddresses.aiNodeRegistry, abi, 'getNodeInfo', [address]);
                    status.isRegistered = true;
                }
                catch (error) {
                    if (!error.message?.includes('NodeNotRegistered')) {
                        throw error;
                    }
                }
            }
            const dloopAbi = this.contractABIs.get('dloopToken');
            if (dloopAbi) {
                try {
                    const balance = await this.transactionManager.executeContractRead(this.contractAddresses.dloopToken, dloopAbi, 'balanceOf', [address]);
                    const requiredAmount = ethers_1.ethers.parseEther('1.0');
                    status.hasTokens = BigInt(balance.toString()) >= requiredAmount;
                }
                catch (error) {
                    logger_js_1.default.warn('Token balance check failed', { nodeId, error: error.message });
                }
            }
            if (dloopAbi && status.hasTokens) {
                try {
                    const allowance = await this.transactionManager.executeContractRead(this.contractAddresses.dloopToken, dloopAbi, 'allowance', [address, this.contractAddresses.aiNodeRegistry]);
                    const requiredAmount = ethers_1.ethers.parseEther('1.0');
                    status.isApproved = BigInt(allowance.toString()) >= requiredAmount;
                }
                catch (error) {
                    logger_js_1.default.warn('Allowance check failed', { nodeId, error: error.message });
                }
            }
            status.canStake = status.hasTokens && (status.isApproved || !status.isRegistered);
        }
        catch (error) {
            status.error = error.message;
            logger_js_1.default.error('Status check failed', { nodeId, error: error.message });
        }
        return status;
    }
    async executeRegistrationRecovery() {
        const results = [];
        let attempted = 0;
        let successful = 0;
        let failed = 0;
        logger_js_1.default.info('Starting comprehensive node registration recovery', {
            totalUnregistered: this.registrationStatuses.size
        });
        for (const [nodeId, status] of this.registrationStatuses) {
            if (status.isRegistered) {
                continue;
            }
            attempted++;
            status.status = 'processing';
            status.attemptCount++;
            status.lastAttempt = Date.now();
            try {
                logger_js_1.default.info('Processing node registration recovery', {
                    nodeId,
                    attempt: status.attemptCount,
                    hasTokens: status.hasTokens,
                    isApproved: status.isApproved
                });
                const result = await this.recoverNodeRegistration(nodeId, status);
                if (result.success) {
                    successful++;
                    status.status = 'registered';
                    status.isRegistered = true;
                    results.push({
                        nodeId,
                        success: true,
                        txHash: result.transactionHash
                    });
                    logger_js_1.default.info('Node registration recovery successful', {
                        nodeId,
                        txHash: result.transactionHash
                    });
                }
                else {
                    failed++;
                    status.status = 'failed';
                    status.error = result.error;
                    results.push({
                        nodeId,
                        success: false,
                        error: result.error
                    });
                    logger_js_1.default.error('Node registration recovery failed', {
                        nodeId,
                        error: result.error
                    });
                }
                await this.delay(2000);
            }
            catch (error) {
                failed++;
                status.status = 'failed';
                status.error = error.message;
                results.push({
                    nodeId,
                    success: false,
                    error: error.message
                });
                logger_js_1.default.error('Node registration recovery exception', {
                    nodeId,
                    error: error.message
                });
            }
        }
        logger_js_1.default.info('Node registration recovery completed', {
            attempted,
            successful,
            failed,
            successRate: attempted > 0 ? Math.round((successful / attempted) * 100) : 0
        });
        return { attempted, successful, failed, results };
    }
    async recoverNodeRegistration(nodeId, status) {
        const wallet = this.walletService.getWalletByAddress(status.address);
        if (!wallet) {
            throw new Error(`Wallet not found for address: ${status.address}`);
        }
        if (status.hasTokens && !status.isApproved) {
            logger_js_1.default.info('Approving DLOOP tokens', { nodeId });
            const approvalResult = await this.approveTokensWithEnhancedGas(wallet);
            if (!approvalResult.success) {
                return {
                    success: false,
                    error: `Token approval failed: ${approvalResult.error}`
                };
            }
            logger_js_1.default.info('Token approval successful', {
                nodeId,
                txHash: approvalResult.transactionHash
            });
            await this.delay(3000);
        }
        const registrationMethods = [
            () => this.attemptRegistrationWithStaking(wallet, nodeId),
            () => this.attemptSimpleRegistration(wallet, nodeId),
            () => this.attemptRegistrationWithDirectApproval(wallet, nodeId)
        ];
        let lastError = '';
        for (let i = 0; i < registrationMethods.length; i++) {
            const methodName = ['Staking', 'Simple', 'DirectApproval'][i];
            try {
                logger_js_1.default.info(`Attempting ${methodName} registration`, { nodeId });
                const result = await registrationMethods[i]();
                if (result.success) {
                    logger_js_1.default.info(`${methodName} registration successful`, {
                        nodeId,
                        txHash: result.transactionHash
                    });
                    return result;
                }
                lastError = result.error || `${methodName} method failed`;
                logger_js_1.default.warn(`${methodName} registration failed`, {
                    nodeId,
                    error: lastError
                });
            }
            catch (error) {
                lastError = error.message;
                logger_js_1.default.warn(`${methodName} registration exception`, {
                    nodeId,
                    error: error.message
                });
            }
            if (i < registrationMethods.length - 1) {
                await this.delay(1000);
            }
        }
        return {
            success: false,
            error: `All registration methods failed. Last error: ${lastError}`
        };
    }
    async approveTokensWithEnhancedGas(wallet) {
        const dloopAbi = this.contractABIs.get('dloopToken');
        if (!dloopAbi) {
            return { success: false, error: 'DLOOP Token ABI not available' };
        }
        const approveAmount = ethers_1.ethers.parseEther('1.0');
        return await this.transactionManager.executeTransaction(wallet, this.contractAddresses.dloopToken, dloopAbi, 'approve', [this.contractAddresses.aiNodeRegistry, approveAmount], {
            gasLimit: '100000',
            retries: 3,
            timeout: 60000
        });
    }
    async attemptRegistrationWithStaking(wallet, nodeId) {
        const abi = this.contractABIs.get('aiNodeRegistry');
        if (!abi) {
            return { success: false, error: 'AI Node Registry ABI not available' };
        }
        const metadata = JSON.stringify({
            name: `AI Governance Node ${nodeId}`,
            description: `Automated governance node`,
            endpoint: `https://governance-node-${nodeId}.example.com`,
            nodeType: 'governance',
            version: '1.0.0',
            registeredAt: Date.now()
        });
        return await this.transactionManager.executeTransaction(wallet, this.contractAddresses.aiNodeRegistry, abi, 'registerNodeWithStaking', [wallet.address, metadata, 0], {
            gasLimit: '1200000',
            retries: 2,
            timeout: 120000
        });
    }
    async attemptSimpleRegistration(wallet, nodeId) {
        const abi = this.contractABIs.get('aiNodeRegistry');
        if (!abi) {
            return { success: false, error: 'AI Node Registry ABI not available' };
        }
        return await this.transactionManager.executeTransaction(wallet, this.contractAddresses.aiNodeRegistry, abi, 'registerNode', [], {
            gasLimit: '800000',
            retries: 2,
            timeout: 120000
        });
    }
    async attemptRegistrationWithDirectApproval(wallet, nodeId) {
        const abi = this.contractABIs.get('aiNodeRegistry');
        if (!abi) {
            return { success: false, error: 'AI Node Registry ABI not available' };
        }
        return await this.transactionManager.executeTransaction(wallet, this.contractAddresses.aiNodeRegistry, abi, 'registerNodeWithOptimizedApproval', [], {
            gasLimit: '900000',
            retries: 2,
            timeout: 120000
        });
    }
    getRegistrationStatuses() {
        return this.registrationStatuses;
    }
    async refreshNodeStatus(nodeId) {
        const currentStatus = this.registrationStatuses.get(nodeId);
        if (!currentStatus) {
            return null;
        }
        const updatedStatus = await this.checkNodeRegistrationStatus(nodeId, currentStatus.address);
        this.registrationStatuses.set(nodeId, { ...currentStatus, ...updatedStatus });
        return this.registrationStatuses.get(nodeId) || null;
    }
    delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
exports.NodeRegistrationRecovery = NodeRegistrationRecovery;
//# sourceMappingURL=NodeRegistrationRecovery.js.map