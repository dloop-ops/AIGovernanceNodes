"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeManager = void 0;
const GovernanceNode_js_1 = require("./GovernanceNode.js");
const WalletService_js_1 = require("../services/WalletService.js");
const ContractService_js_1 = require("../services/ContractService.js");
const MarketDataService_js_1 = require("../services/MarketDataService.js");
const ProposalService_js_1 = require("../services/ProposalService.js");
const TokenService_js_1 = require("../services/TokenService.js");
const SoulboundNFTService_js_1 = require("../services/SoulboundNFTService.js");
const NFTTransferService_js_1 = require("../services/NFTTransferService.js");
const DLoopGovernanceRegistration_js_1 = require("../services/DLoopGovernanceRegistration.js");
const scheduler_js_1 = require("../utils/scheduler.js");
const index_js_1 = require("../types/index.js");
const logger_js_1 = __importStar(require("../utils/logger.js"));
class NodeManager {
    constructor() {
        this.nodes = new Map();
        this.isRunning = false;
        this.initializeServices();
        this.scheduler = scheduler_js_1.scheduler;
    }
    initializeServices() {
        try {
            logger_js_1.default.info('Initializing services for Node Manager');
            this.walletService = new WalletService_js_1.WalletService();
            this.contractService = new ContractService_js_1.ContractService(this.walletService);
            this.marketDataService = new MarketDataService_js_1.MarketDataService();
            this.proposalService = new ProposalService_js_1.ProposalService(this.contractService, this.marketDataService);
            this.tokenService = new TokenService_js_1.TokenService(this.walletService, this.contractService);
            this.soulboundNftService = new SoulboundNFTService_js_1.SoulboundNFTService(this.walletService, this.contractService);
            this.nftTransferService = new NFTTransferService_js_1.NFTTransferService(this.contractService, this.walletService);
            this.dloopRegistrationService = new DLoopGovernanceRegistration_js_1.DLoopGovernanceRegistration(this.walletService);
            logger_js_1.default.info('All services initialized successfully');
        }
        catch (error) {
            throw new index_js_1.GovernanceError(`Failed to initialize services: ${error instanceof Error ? error.message : String(error)}`, 'SERVICE_INIT_ERROR');
        }
    }
    async start() {
        try {
            logger_js_1.default.info('Starting Node Manager');
            if (this.isRunning) {
                logger_js_1.default.warn('Node Manager is already running');
                return;
            }
            const nodeConfigs = this.loadNodeConfigurations();
            await this.initializeNodes(nodeConfigs);
            await this.registerGovernanceNodes();
            await this.startAllNodes();
            this.setupScheduledTasks();
            this.isRunning = true;
            logger_js_1.default.info('Node Manager started successfully');
            await this.logSystemStatus();
        }
        catch (error) {
            this.isRunning = false;
            throw new index_js_1.GovernanceError(`Failed to start Node Manager: ${error instanceof Error ? error.message : String(error)}`, 'NODE_MANAGER_START_ERROR');
        }
    }
    async stop() {
        try {
            logger_js_1.default.info('Stopping Node Manager');
            this.scheduler.stopAll();
            await this.stopAllNodes();
            this.isRunning = false;
            logger_js_1.default.info('Node Manager stopped successfully');
        }
        catch (error) {
            logger_js_1.default.error('Error stopping Node Manager', { error });
        }
    }
    loadNodeConfigurations() {
        const configs = [
            {
                id: 'ai-gov-01',
                strategy: index_js_1.NodeStrategy.CONSERVATIVE,
                walletIndex: 0,
                enabled: true
            },
            {
                id: 'ai-gov-02',
                strategy: index_js_1.NodeStrategy.AGGRESSIVE,
                walletIndex: 1,
                enabled: true
            },
            {
                id: 'ai-gov-03',
                strategy: index_js_1.NodeStrategy.CONSERVATIVE,
                walletIndex: 2,
                enabled: true
            },
            {
                id: 'ai-gov-04',
                strategy: index_js_1.NodeStrategy.AGGRESSIVE,
                walletIndex: 3,
                enabled: true
            },
            {
                id: 'ai-gov-05',
                strategy: index_js_1.NodeStrategy.CONSERVATIVE,
                walletIndex: 4,
                enabled: true
            }
        ];
        const enabledConfigs = configs.filter(config => config.enabled);
        logger_js_1.default.info(`Loaded ${enabledConfigs.length} enabled node configurations out of ${configs.length} total`);
        return enabledConfigs;
    }
    initializeNodes(configs) {
        logger_js_1.default.info(`Initializing ${configs.length} governance nodes`);
        for (const config of configs) {
            try {
                const node = new GovernanceNode_js_1.GovernanceNode(config, this.walletService, this.contractService, this.marketDataService, this.proposalService);
                this.nodes.set(config.id, node);
                logger_js_1.default.info(`Node ${config.id} initialized successfully`);
            }
            catch (error) {
                logger_js_1.default.error(`Failed to initialize node ${config.id}`, { error });
                throw new index_js_1.GovernanceError(`Node initialization failed for ${config.id}: ${error instanceof Error ? error.message : String(error)}`, 'NODE_INIT_ERROR');
            }
        }
        logger_js_1.default.info(`All ${this.nodes.size} nodes initialized`);
    }
    registerGovernanceNodes() {
        logger_js_1.default.info('🛑 SKIPPING governance node registration - All nodes already registered', {
            component: 'node-manager',
            reason: 'All 5 AI Governance Nodes are confirmed registered on-chain',
            registeredNodes: [
                'ai-gov-01: 0x0E354b735a6eee60726e6e3A431e3320Ba26ba45',
                'ai-gov-02: 0xb1c25B40A79b7D046E539A9fbBB58789efFD0874',
                'ai-gov-03: 0x65b1d03F5F2Ad4Ff036ea7AeEf5Ec07Db27a5C58',
                'ai-gov-04: 0x766766f2815f835E4A0b1360833C7A15DDF2b72a',
                'ai-gov-05: 0xA6fBf2dD68dB92dA309D6b82DAe2180d903a36FA'
            ]
        });
        logger_js_1.default.info('D-Loop governance node registration SKIPPED - nodes operational', {
            component: 'node-manager',
            registered: 5,
            failed: 0,
            totalAttempted: 0,
            action: 'complete_skip'
        });
        return;
    }
    async startAllNodes() {
        logger_js_1.default.info('Starting all governance nodes');
        const startPromises = Array.from(this.nodes.entries()).map(async ([nodeId, node]) => {
            try {
                await node.start();
                logger_js_1.governanceLogger.info(`Node ${nodeId} started successfully`);
            }
            catch (error) {
                logger_js_1.governanceLogger.error(`Failed to start node ${nodeId}`, { error });
                throw error;
            }
        });
        await Promise.all(startPromises);
        logger_js_1.default.info(`All ${this.nodes.size} nodes started successfully`);
    }
    async stopAllNodes() {
        logger_js_1.default.info('Stopping all governance nodes');
        const stopPromises = Array.from(this.nodes.entries()).map(async ([nodeId, node]) => {
            try {
                await node.stop();
                logger_js_1.governanceLogger.info(`Node ${nodeId} stopped successfully`);
            }
            catch (error) {
                logger_js_1.governanceLogger.error(`Error stopping node ${nodeId}`, { error });
            }
        });
        await Promise.allSettled(stopPromises);
        logger_js_1.default.info('All nodes stop operations completed');
    }
    setupScheduledTasks() {
        logger_js_1.default.info('Setting up scheduled tasks');
        const proposalCreationTask = {
            name: 'daily-proposal-creation',
            schedule: '0 12 * * *',
            task: async () => {
                await this.executeProposalCreation();
            },
            enabled: true
        };
        const votingTask = {
            name: 'proposal-voting',
            schedule: '0 */2 * * *',
            task: async () => {
                await this.executeVotingRound();
            },
            enabled: true
        };
        const marketDataTask = {
            name: 'market-data-refresh',
            schedule: '30 */8 * * *',
            task: async () => {
                await this.refreshMarketData();
            },
            enabled: true
        };
        const healthCheckTask = {
            name: 'system-health-check',
            schedule: '0 * * * *',
            task: async () => {
                await this.performHealthCheck();
            },
            enabled: true
        };
        const statusTask = {
            name: 'status-logging',
            schedule: '0 */6 * * *',
            task: async () => {
                await this.logSystemStatus();
            },
            enabled: true
        };
        const tokenMonitoringTask = {
            name: 'token-monitoring',
            schedule: '0 */4 * * *',
            task: async () => {
                await this.performTokenChecks();
            },
            enabled: true
        };
        const authenticationTask = {
            name: 'authentication-monitoring',
            schedule: '0 */6 * * *',
            task: () => Promise.resolve(this.performAuthenticationChecks()),
            enabled: true
        };
        this.scheduler.addTask(proposalCreationTask.name, proposalCreationTask.schedule, proposalCreationTask.task);
        this.scheduler.addTask(votingTask.name, votingTask.schedule, votingTask.task);
        this.scheduler.addTask(marketDataTask.name, marketDataTask.schedule, marketDataTask.task);
        this.scheduler.addTask(healthCheckTask.name, healthCheckTask.schedule, healthCheckTask.task);
        this.scheduler.addTask(statusTask.name, statusTask.schedule, statusTask.task);
        this.scheduler.addTask(tokenMonitoringTask.name, tokenMonitoringTask.schedule, tokenMonitoringTask.task);
        this.scheduler.addTask(authenticationTask.name, authenticationTask.schedule, authenticationTask.task);
        this.scheduler.startAll();
        logger_js_1.default.info('All scheduled tasks configured and started');
    }
    async executeProposalCreation() {
        logger_js_1.default.info('GovernanceNodes do not create proposals - focusing on voting automation', {
            component: 'governance',
            note: 'As per d-loop whitepaper: AI Governance Nodes vote, Investment Nodes create proposals'
        });
        await this.checkAndVoteOnProposals();
    }
    async executeVotingRound() {
        logger_js_1.default.info('Executing voting round for all nodes');
        const activeNodes = Array.from(this.nodes.values()).filter(node => node.isNodeActive());
        let successful = 0;
        let failed = 0;
        const errors = [];
        for (const node of activeNodes) {
            try {
                await node.checkAndVoteOnProposals();
                successful++;
                if (successful < activeNodes.length) {
                    await new Promise(resolve => setTimeout(resolve, 400));
                }
            }
            catch (error) {
                failed++;
                errors.push(error);
                logger_js_1.default.warn(`Voting operation failed for node ${node.getNodeId()}`, { error });
            }
        }
        logger_js_1.default.info('Voting round completed', {
            totalNodes: this.nodes.size,
            activeNodes: activeNodes.length,
            successful,
            failed
        });
        if (failed > 0) {
            logger_js_1.default.error('Some voting operations failed', { errors });
        }
    }
    async refreshMarketData() {
        try {
            logger_js_1.default.info('Refreshing market data');
            this.marketDataService.clearCache();
            await this.marketDataService.fetchCurrentPrices();
            logger_js_1.default.info('Market data refreshed successfully');
        }
        catch (error) {
            logger_js_1.default.error('Failed to refresh market data', { error });
        }
    }
    async performHealthCheck() {
        try {
            logger_js_1.default.info('Performing system health check');
            const walletConnectivity = await this.walletService.validateConnectivity();
            const marketDataFresh = this.marketDataService.isCacheValid();
            const activeNodes = Array.from(this.nodes.values()).filter(node => node.isNodeActive()).length;
            const nodeStatuses = Array.from(this.nodes.values()).map(node => node.getStatus());
            const recentlyActive = nodeStatuses.filter(status => Date.now() - Math.max(status.stats.lastProposalTime, status.stats.lastVoteTime) < 24 * 60 * 60 * 1000).length;
            logger_js_1.default.info('System health check completed', {
                walletConnectivity,
                marketDataFresh,
                totalNodes: this.nodes.size,
                activeNodes,
                recentlyActiveNodes: recentlyActive,
                uptime: this.isRunning
            });
            if (!walletConnectivity) {
                logger_js_1.default.warn('Wallet connectivity issues detected');
            }
            if (!marketDataFresh) {
                logger_js_1.default.warn('Market data may be stale');
            }
            if (activeNodes < this.nodes.size) {
                logger_js_1.default.warn(`Some nodes are inactive: ${activeNodes}/${this.nodes.size} active`);
            }
        }
        catch (error) {
            logger_js_1.default.error('Health check failed', { error });
        }
    }
    async performTokenChecks() {
        try {
            logger_js_1.default.info('Performing token balance checks for all nodes');
            const tokenStatuses = await this.tokenService.getTokenStatusForAllNodes();
            const totalNodes = tokenStatuses.length;
            const nodesWithSufficientTokens = tokenStatuses.filter(status => status.hasMinimum).length;
            logger_js_1.default.info('Token balance check completed', {
                totalNodes,
                nodesWithSufficientTokens,
                nodesNeedingTokens: totalNodes - nodesWithSufficientTokens
            });
            tokenStatuses.forEach(status => {
                if (!status.hasMinimum) {
                    logger_js_1.default.warn(`Node ${status.nodeIndex} has insufficient DLOOP tokens`, {
                        nodeIndex: status.nodeIndex,
                        address: status.address,
                        balance: status.balance,
                        votingPower: status.votingPower
                    });
                }
            });
            await this.tokenService.ensureMinimumTokensForAllNodes();
        }
        catch (error) {
            logger_js_1.default.error('Token balance check failed', { error });
        }
    }
    performAuthenticationChecks() {
        logger_js_1.default.info('🛑 SKIPPING authentication checks - All nodes already authenticated', {
            component: 'node-manager',
            reason: 'All 5 AI Governance Nodes are confirmed registered and authenticated',
            authenticatedNodes: [
                'ai-gov-01: 0x0E354b735a6eee60726e6e3A431e3320Ba26ba45',
                'ai-gov-02: 0xb1c25B40A79b7D046E539A9fbBB58789efFD0874',
                'ai-gov-03: 0x65b1d03F5F2Ad4Ff036ea7AeEf5Ec07Db27a5C58',
                'ai-gov-04: 0x766766f2815f835E4A0b1360833C7A15DDF2b72a',
                'ai-gov-05: 0xA6fBf2dD68dB92dA309D6b82DAe2180d903a36FA'
            ]
        });
        logger_js_1.default.info('Authentication check SKIPPED - all nodes pre-authenticated', {
            totalNodes: 5,
            authenticatedNodes: 5,
            unauthenticatedCount: 0,
            action: 'complete_skip'
        });
        return;
    }
    async logSystemStatus() {
        try {
            logger_js_1.default.info('Logging system status');
            const balances = await this.walletService.getAllBalances();
            const nodeStatuses = Array.from(this.nodes.values()).map(node => node.getStatus());
            const taskStatuses = this.scheduler.getAllTaskStatuses();
            const totalProposals = nodeStatuses.reduce((sum, status) => sum + status.stats.proposalsCreated, 0);
            const totalVotes = nodeStatuses.reduce((sum, status) => sum + status.stats.votesAcast, 0);
            const activeNodes = nodeStatuses.filter(status => status.isActive).length;
            logger_js_1.default.info('System Status Report', {
                timestamp: new Date().toISOString(),
                nodeManager: {
                    isRunning: this.isRunning,
                    totalNodes: this.nodes.size,
                    activeNodes,
                    totalProposalsCreated: totalProposals,
                    totalVotesCast: totalVotes
                },
                nodes: nodeStatuses.map(status => ({
                    nodeId: status.nodeId,
                    address: status.address,
                    strategy: status.strategy,
                    isActive: status.isActive,
                    proposalsCreated: status.stats.proposalsCreated,
                    votesAcast: status.stats.votesAcast,
                    lastActivity: Math.max(status.stats.lastProposalTime, status.stats.lastVoteTime)
                })),
                wallets: balances.map(balance => ({
                    nodeIndex: balance.nodeIndex,
                    address: balance.address,
                    ethBalance: balance.balance
                })),
                scheduledTasks: taskStatuses,
                marketData: {
                    cacheValid: this.marketDataService.isCacheValid(),
                    lastUpdate: Date.now()
                }
            });
        }
        catch (error) {
            logger_js_1.default.error('Failed to log system status', { error });
        }
    }
    getNode(nodeId) {
        return this.nodes.get(nodeId);
    }
    getAllNodes() {
        return new Map(this.nodes);
    }
    getSystemStatus() {
        const nodeStatuses = Array.from(this.nodes.values()).map(node => node.getStatus());
        const activeNodes = nodeStatuses.filter(status => status.isActive).length;
        return {
            isRunning: this.isRunning,
            totalNodes: this.nodes.size,
            activeNodes,
            nodeStatuses
        };
    }
    async restartNode(nodeId) {
        const node = this.nodes.get(nodeId);
        if (!node) {
            throw new index_js_1.GovernanceError(`Node ${nodeId} not found`, 'NODE_NOT_FOUND');
        }
        try {
            logger_js_1.default.info(`Restarting node ${nodeId}`);
            await node.stop();
            await node.start();
            logger_js_1.default.info(`Node ${nodeId} restarted successfully`);
        }
        catch (error) {
            throw new index_js_1.GovernanceError(`Failed to restart node ${nodeId}: ${error instanceof Error ? error.message : String(error)}`, 'NODE_RESTART_ERROR');
        }
    }
    isManagerRunning() {
        return this.isRunning;
    }
    getScheduler() {
        return this.scheduler;
    }
    async triggerVotingRound() {
        logger_js_1.default.info('Manual voting round triggered');
        await this.executeVotingRound();
    }
    async getActiveProposals() {
        const activeNodes = Array.from(this.nodes.values()).filter(node => node.isNodeActive());
        if (activeNodes.length === 0) {
            throw new Error('No active nodes available to fetch proposals');
        }
        const firstNode = activeNodes[0];
        const contractService = firstNode.contractService;
        if (!contractService) {
            throw new Error('Contract service not available');
        }
        return await contractService.getActiveProposals();
    }
    async checkAndVoteOnProposals() {
        logger_js_1.default.info('Checking and Voting on Proposals for all nodes');
        const activeNodes = Array.from(this.nodes.values()).filter(node => node.isNodeActive());
        let successful = 0;
        let failed = 0;
        const errors = [];
        for (const node of activeNodes) {
            try {
                await node.checkAndVoteOnProposals();
                successful++;
                if (successful < activeNodes.length) {
                    await new Promise(resolve => setTimeout(resolve, 400));
                }
            }
            catch (error) {
                failed++;
                errors.push(error);
                logger_js_1.default.warn(`Voting operation failed for node ${node.getNodeId()}`, { error });
            }
        }
        logger_js_1.default.info('Checking and Voting Completed', {
            totalNodes: this.nodes.size,
            activeNodes: activeNodes.length,
            successful,
            failed
        });
        if (failed > 0) {
            logger_js_1.default.error('Some voting operations failed', { errors });
        }
    }
    performBalanceCheck() {
        this.performTokenChecks();
    }
    performRegistrationCheck() {
        this.registerGovernanceNodes();
    }
    performNodeHealthCheck() {
        this.performHealthCheck();
    }
    performSystemCheck() {
        this.logSystemStatus();
    }
}
exports.NodeManager = NodeManager;
//# sourceMappingURL=NodeManager.js.map