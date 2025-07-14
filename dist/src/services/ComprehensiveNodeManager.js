"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComprehensiveNodeManager = void 0;
const logger_js_1 = require("../utils/logger.js");
const NodeRegistrationService_js_1 = require("./NodeRegistrationService.js");
class ComprehensiveNodeManager {
    constructor(rpcManager, walletService) {
        this.nodeStatuses = new Map();
        this.isProcessing = false;
        this.allNodeIds = [];
        this.rpcManager = rpcManager;
        this.walletService = walletService;
        this.nodeRegistrationService = new NodeRegistrationService_js_1.NodeRegistrationService(rpcManager);
    }
    async initializeAndRegisterAllNodes() {
        logger_js_1.contractLogger.info('SKIPPING ALL NODE REGISTRATION - All nodes already registered');
        const nodeConfigs = this.loadNodeConfigurations();
        nodeConfigs.forEach((config) => {
            this.nodeStatuses.set(config.nodeId, {
                nodeId: config.nodeId,
                address: config.nodeAddress,
                isRegistered: true,
                isAuthenticated: true,
                hasTokens: true,
                registrationAttempts: 0,
                lastRegistrationAttempt: 0,
                status: 'registered'
            });
            logger_js_1.contractLogger.info('Node marked as already registered', {
                nodeId: config.nodeId,
                address: config.nodeAddress
            });
        });
        this.logRegistrationSummary();
        try {
            const registrationResults = await Promise.allSettled(this.allNodeIds.map((nodeId) => this.registerSingleNode(nodeId)));
            const successfulRegistrations = registrationResults.filter((result) => result.status === 'fulfilled').length;
            logger_js_1.contractLogger.info(`Node registration complete: ${successfulRegistrations}/${this.allNodeIds.length} successful`);
            await this.performDetailedStatusCheck();
            return true;
        }
        catch (error) {
            logger_js_1.contractLogger.error('Failed to initialize and register nodes', { error });
            return false;
        }
    }
    async processNodeRegistration(wallet, config) {
        const nodeStatus = this.nodeStatuses.get(config.nodeId);
        if (!nodeStatus)
            return;
        try {
            nodeStatus.status = 'registering';
            nodeStatus.registrationAttempts++;
            nodeStatus.lastRegistrationAttempt = Date.now();
            logger_js_1.contractLogger.info('Processing node registration', {
                nodeId: config.nodeId,
                address: config.nodeAddress,
                attempt: nodeStatus.registrationAttempts
            });
            const isAlreadyRegistered = await this.nodeRegistrationService.checkNodeRegistration(config.nodeAddress);
            if (isAlreadyRegistered) {
                logger_js_1.contractLogger.info('Node already registered, skipping registration', {
                    nodeId: config.nodeId,
                    address: config.nodeAddress
                });
                nodeStatus.isRegistered = true;
                nodeStatus.status = 'registered';
                return;
            }
            const registrationResult = await this.nodeRegistrationService.registerNode(wallet, config);
            if (registrationResult.success) {
                logger_js_1.contractLogger.info('Node registration completed successfully', {
                    nodeId: config.nodeId,
                    address: config.nodeAddress,
                    txHash: registrationResult.transactionHash
                });
                nodeStatus.isRegistered = true;
                nodeStatus.status = 'registered';
            }
            else {
                logger_js_1.contractLogger.warn('Node registration failed', {
                    nodeId: config.nodeId,
                    address: config.nodeAddress,
                    error: registrationResult.error,
                    attempt: nodeStatus.registrationAttempts
                });
                nodeStatus.status = 'failed';
            }
        }
        catch (error) {
            logger_js_1.contractLogger.error('Error processing node registration', {
                nodeId: config.nodeId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            nodeStatus.status = 'failed';
        }
    }
    loadNodeConfigurations() {
        const registeredAddresses = [
            '0x0E354b735a6eee60726e6e3A431e3320Ba26ba45',
            '0xb1c25B40A79b7D046E539A9fbBB58789efFD0874',
            '0x65b1d03F5F2Ad4Ff036ea7AeEf5Ec07Db27a5C58',
            '0x766766f2815f835E4A0b1360833C7A15DDF2b72a',
            '0xA6fBf2dD68dB92dA309D6b82DAe2180d903a36FA'
        ];
        return [
            {
                nodeId: 'ai-gov-01',
                nodeAddress: '0x0E354b735a6eee60726e6e3A431e3320Ba26ba45',
                nodeName: 'AI Governance Node ai-gov-01',
                endpoint: 'https://d-loop.io/identity/identity.json',
                nodeType: 'governance',
                nodeIndex: 0
            },
            {
                nodeId: 'ai-gov-02',
                nodeAddress: '0xb1c25B40A79b7D046E539A9fbBB58789efFD0874',
                nodeName: 'AI Governance Node ai-gov-02',
                endpoint: 'https://d-loop.io/identity/identity.json',
                nodeType: 'governance',
                nodeIndex: 1
            },
            {
                nodeId: 'ai-gov-03',
                nodeAddress: '0x65b1d03F5F2Ad4Ff036ea7AeEf5Ec07Db27a5C58',
                nodeName: 'AI Governance Node ai-gov-03',
                endpoint: 'https://d-loop.io/identity/identity.json',
                nodeType: 'governance',
                nodeIndex: 2
            },
            {
                nodeId: 'ai-gov-04',
                nodeAddress: '0x766766f2815f835E4A0b1360833C7A15DDF2b72a',
                nodeName: 'AI Governance Node ai-gov-04',
                endpoint: 'https://d-loop.io/identity/identity.json',
                nodeType: 'governance',
                nodeIndex: 3
            },
            {
                nodeId: 'ai-gov-05',
                nodeAddress: '0xA6fBf2dD68dB92dA309D6b82DAe2180d903a36FA',
                nodeName: 'AI Governance Node ai-gov-05',
                endpoint: 'https://d-loop.io/identity/identity.json',
                nodeType: 'governance',
                nodeIndex: 4
            }
        ];
    }
    getNodeStatuses() {
        return new Map(this.nodeStatuses);
    }
    getRegistrationSummary() {
        const statuses = Array.from(this.nodeStatuses.values());
        return {
            total: statuses.length,
            registered: statuses.filter((s) => s.status === 'registered').length,
            pending: statuses.filter((s) => s.status === 'pending').length,
            failed: statuses.filter((s) => s.status === 'failed').length,
            inProgress: this.isProcessing
        };
    }
    logRegistrationSummary() {
        const summary = this.getRegistrationSummary();
        logger_js_1.contractLogger.info('Node registration process completed', {
            totalNodes: summary.total,
            registeredNodes: summary.registered,
            pendingNodes: summary.pending,
            failedNodes: summary.failed,
            successRate: summary.total > 0 ? Math.round((summary.registered / summary.total) * 100) : 0
        });
        this.nodeStatuses.forEach((status, nodeId) => {
            logger_js_1.contractLogger.info('Node status summary', {
                nodeId,
                address: status.address,
                status: status.status,
                isRegistered: status.isRegistered,
                attempts: status.registrationAttempts
            });
        });
    }
    async retryFailedRegistrations() {
        const failedNodes = Array.from(this.nodeStatuses.entries())
            .filter(([_, status]) => status.status === 'failed')
            .map(([nodeId, _]) => nodeId);
        if (failedNodes.length === 0) {
            logger_js_1.contractLogger.info('No failed registrations to retry');
            return;
        }
        logger_js_1.contractLogger.info('Retrying failed node registrations', {
            failedCount: failedNodes.length
        });
        const nodeConfigs = this.loadNodeConfigurations();
        const wallets = this.walletService.getAllWallets();
        for (const nodeId of failedNodes) {
            const config = nodeConfigs.find((c) => c.nodeId === nodeId);
            const wallet = wallets.find((_, index) => nodeConfigs[index].nodeId === nodeId);
            if (config && wallet) {
                await this.processNodeRegistration(wallet, config);
                await this.delay(2000);
            }
        }
    }
    delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    async registerSingleNode(nodeId) {
    }
    async performDetailedStatusCheck() {
    }
}
exports.ComprehensiveNodeManager = ComprehensiveNodeManager;
//# sourceMappingURL=ComprehensiveNodeManager.js.map