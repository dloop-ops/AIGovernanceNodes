import { ethers } from 'ethers';
import fs from 'fs';
import logger from '../utils/logger.js';
import { TransactionManager } from './TransactionManager.js';
export class NodeRegistrationRecovery {
    rpcManager;
    transactionManager;
    walletService;
    registrationStatuses = new Map();
    contractAddresses;
    contractABIs = new Map();
    constructor(rpcManager, walletService) {
        this.rpcManager = rpcManager;
        this.transactionManager = new TransactionManager(rpcManager);
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
            logger.info('Node registration recovery system initialized', {
                unregisteredNodes: this.registrationStatuses.size
            });
        }
        catch (error) {
            logger.error('Failed to initialize recovery system', { error: error.message });
        }
    }
    async loadContractABIs() {
        try {
            // Load ABI files using ES module imports
            const abiFiles = [
                { name: 'aiNodeRegistry', file: 'attached_assets/ainoderegistry.abi.v1.json' },
                { name: 'dloopToken', file: 'attached_assets/dlooptoken.abi.v1.json' },
                { name: 'soulboundNft', file: 'attached_assets/soulboundnft.abi.v1.json' }
            ];
            for (const { name, file } of abiFiles) {
                try {
                    const abiData = JSON.parse(fs.readFileSync(file, 'utf8'));
                    this.contractABIs.set(name, abiData.abi || abiData);
                    logger.debug(`Contract ABI loaded: ${name}`);
                }
                catch (error) {
                    logger.warn(`Failed to load ABI: ${name}`, { file, error: error.message });
                }
            }
        }
        catch (error) {
            logger.error('ABI loading failed', { error: error.message });
        }
    }
    async scanUnregisteredNodes() {
        const nodeConfigs = [
            { nodeId: 'ai-gov-01', address: '0x561529036AB886c1FD3D112360383D79fBA9E71c' },
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
                    logger.info('Unregistered node detected', {
                        nodeId: config.nodeId,
                        address: config.address,
                        hasTokens: status.hasTokens
                    });
                }
            }
            catch (error) {
                logger.warn('Failed to check node status', {
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
            // Check registration status
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
            // Check token balance
            const dloopAbi = this.contractABIs.get('dloopToken');
            if (dloopAbi) {
                try {
                    const balance = await this.transactionManager.executeContractRead(this.contractAddresses.dloopToken, dloopAbi, 'balanceOf', [address]);
                    const requiredAmount = ethers.parseEther('1.0');
                    status.hasTokens = BigInt(balance.toString()) >= requiredAmount;
                }
                catch (error) {
                    logger.warn('Token balance check failed', { nodeId, error: error.message });
                }
            }
            // Check approval status
            if (dloopAbi && status.hasTokens) {
                try {
                    const allowance = await this.transactionManager.executeContractRead(this.contractAddresses.dloopToken, dloopAbi, 'allowance', [address, this.contractAddresses.aiNodeRegistry]);
                    const requiredAmount = ethers.parseEther('1.0');
                    status.isApproved = BigInt(allowance.toString()) >= requiredAmount;
                }
                catch (error) {
                    logger.warn('Allowance check failed', { nodeId, error: error.message });
                }
            }
            status.canStake = status.hasTokens && (status.isApproved || !status.isRegistered);
        }
        catch (error) {
            status.error = error.message;
            logger.error('Status check failed', { nodeId, error: error.message });
        }
        return status;
    }
    async executeRegistrationRecovery() {
        const results = [];
        let attempted = 0;
        let successful = 0;
        let failed = 0;
        logger.info('Starting comprehensive node registration recovery', {
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
                logger.info('Processing node registration recovery', {
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
                    logger.info('Node registration recovery successful', {
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
                    logger.error('Node registration recovery failed', {
                        nodeId,
                        error: result.error
                    });
                }
                // Wait between attempts to avoid rate limiting
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
                logger.error('Node registration recovery exception', {
                    nodeId,
                    error: error.message
                });
            }
        }
        logger.info('Node registration recovery completed', {
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
        // Strategy 1: If tokens need approval, approve first
        if (status.hasTokens && !status.isApproved) {
            logger.info('Approving DLOOP tokens', { nodeId });
            const approvalResult = await this.approveTokensWithEnhancedGas(wallet);
            if (!approvalResult.success) {
                return {
                    success: false,
                    error: `Token approval failed: ${approvalResult.error}`
                };
            }
            logger.info('Token approval successful', {
                nodeId,
                txHash: approvalResult.transactionHash
            });
            // Wait for approval confirmation
            await this.delay(3000);
        }
        // Strategy 2: Attempt registration with multiple methods
        const registrationMethods = [
            () => this.attemptRegistrationWithStaking(wallet, nodeId),
            () => this.attemptSimpleRegistration(wallet, nodeId),
            () => this.attemptRegistrationWithDirectApproval(wallet, nodeId)
        ];
        let lastError = '';
        for (let i = 0; i < registrationMethods.length; i++) {
            const methodName = ['Staking', 'Simple', 'DirectApproval'][i];
            try {
                logger.info(`Attempting ${methodName} registration`, { nodeId });
                const result = await registrationMethods[i]();
                if (result.success) {
                    logger.info(`${methodName} registration successful`, {
                        nodeId,
                        txHash: result.transactionHash
                    });
                    return result;
                }
                lastError = result.error || `${methodName} method failed`;
                logger.warn(`${methodName} registration failed`, {
                    nodeId,
                    error: lastError
                });
            }
            catch (error) {
                lastError = error.message;
                logger.warn(`${methodName} registration exception`, {
                    nodeId,
                    error: error.message
                });
            }
            // Wait between method attempts
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
        const approveAmount = ethers.parseEther('1.0');
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
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
//# sourceMappingURL=NodeRegistrationRecovery.js.map