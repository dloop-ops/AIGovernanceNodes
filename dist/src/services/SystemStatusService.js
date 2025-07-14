"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemStatusService = void 0;
const logger_js_1 = require("../utils/logger.js");
class SystemStatusService {
    constructor() {
        this.rpcManager = null;
        this.nodeManager = null;
        logger_js_1.contractLogger.info('System Status Service initialized');
    }
    setRpcManager(rpcManager) {
        this.rpcManager = rpcManager;
    }
    setNodeManager(nodeManager) {
        this.nodeManager = nodeManager;
    }
    getComprehensiveStatus() {
        const timestamp = Date.now();
        const rpcStatus = this.getRpcInfrastructureStatus();
        const nodeStatus = this.getGovernanceNodesStatus();
        const taskStatus = this.getScheduledTasksStatus();
        const systemStatus = {
            timestamp,
            rpcInfrastructure: rpcStatus,
            governanceNodes: nodeStatus,
            scheduledTasks: taskStatus
        };
        this.logSystemHealth(systemStatus);
        return systemStatus;
    }
    getRpcInfrastructureStatus() {
        if (!this.rpcManager) {
            return {
                status: 'critical',
                activeConnections: 0,
                totalEndpoints: 0,
                rateLimitHandling: {
                    totalRequests: 0,
                    successfulRequests: 0,
                    failedRequests: 0,
                    rateLimitHits: 0,
                    averageResponseTime: 0
                },
                networkMonitoring: {
                    healthyProviders: [],
                    unhealthyProviders: [],
                    bestProvider: null,
                    networkHealthy: false
                },
                connectionPool: {}
            };
        }
        const comprehensiveStatus = this.rpcManager.getComprehensiveStatus();
        const metrics = comprehensiveStatus.rpcManager;
        const endpointStatuses = comprehensiveStatus.endpoints;
        const healthyEndpoints = endpointStatuses.filter((e) => e.isHealthy).length;
        const totalEndpoints = endpointStatuses.length;
        let status = 'healthy';
        if (healthyEndpoints === 0) {
            status = 'critical';
        }
        else if (healthyEndpoints < totalEndpoints * 0.75) {
            status = 'degraded';
        }
        return {
            status,
            activeConnections: healthyEndpoints,
            totalEndpoints,
            rateLimitHandling: {
                totalRequests: metrics.totalRequests,
                successfulRequests: metrics.successfulRequests,
                failedRequests: metrics.failedRequests,
                rateLimitHits: metrics.rateLimitHits,
                averageResponseTime: Math.round(metrics.averageResponseTime)
            },
            networkMonitoring: {
                healthyProviders: comprehensiveStatus.healthySummary.networkHealthy
                    ? endpointStatuses.filter((e) => e.isHealthy).map((e) => e.name)
                    : [],
                unhealthyProviders: endpointStatuses.filter((e) => !e.isHealthy).map((e) => e.name),
                bestProvider: comprehensiveStatus.healthySummary.bestProvider,
                networkHealthy: comprehensiveStatus.healthySummary.networkHealthy
            },
            connectionPool: comprehensiveStatus.poolStatus
        };
    }
    getGovernanceNodesStatus() {
        if (!this.nodeManager) {
            return {
                totalNodes: 0,
                activeNodes: 0,
                authenticatedNodes: 0,
                registrationStatus: 'pending'
            };
        }
        const systemStatus = this.nodeManager.getSystemStatus();
        const totalNodes = systemStatus.totalNodes;
        const activeNodes = systemStatus.activeNodes;
        const authenticatedNodes = activeNodes;
        let registrationStatus = 'pending';
        if (activeNodes > 0) {
            registrationStatus = activeNodes === totalNodes ? 'completed' : 'in_progress';
        }
        return {
            totalNodes,
            activeNodes,
            authenticatedNodes,
            registrationStatus
        };
    }
    getScheduledTasksStatus() {
        if (!this.nodeManager) {
            return [];
        }
        return [
            {
                name: 'Daily Proposal Creation',
                status: 'running',
                lastExecution: Date.now() - 12 * 60 * 60 * 1000
            },
            {
                name: 'Voting Check',
                status: 'running',
                lastExecution: Date.now() - 4 * 60 * 60 * 1000
            },
            {
                name: 'Market Data Fetch',
                status: 'running',
                lastExecution: Date.now() - 30 * 60 * 1000
            }
        ];
    }
    logSystemHealth(status) {
        const rpc = status.rpcInfrastructure;
        const nodes = status.governanceNodes;
        logger_js_1.contractLogger.info('System Health Summary', {
            rpcStatus: rpc.status,
            rpcConnections: `${rpc.activeConnections}/${rpc.totalEndpoints}`,
            rateLimitHandling: {
                successRate: rpc.rateLimitHandling.totalRequests > 0
                    ? Math.round((rpc.rateLimitHandling.successfulRequests / rpc.rateLimitHandling.totalRequests) *
                        100)
                    : 0,
                avgResponseTime: rpc.rateLimitHandling.averageResponseTime,
                rateLimitHits: rpc.rateLimitHandling.rateLimitHits
            },
            nodeStatus: {
                active: `${nodes.activeNodes}/${nodes.totalNodes}`,
                authenticated: nodes.authenticatedNodes,
                registrationStatus: nodes.registrationStatus
            },
            networkHealth: rpc.networkMonitoring.networkHealthy,
            bestProvider: rpc.networkMonitoring.bestProvider
        });
    }
    getMetricsSummary() {
        const status = this.getComprehensiveStatus();
        const rpc = status.rpcInfrastructure;
        const rpcReliability = rpc.totalEndpoints > 0 ? (rpc.activeConnections / rpc.totalEndpoints) * 100 : 0;
        const networkHealth = rpc.networkMonitoring.networkHealthy
            ? 100
            : (rpc.networkMonitoring.healthyProviders.length /
                (rpc.networkMonitoring.healthyProviders.length +
                    rpc.networkMonitoring.unhealthyProviders.length)) *
                100;
        const systemUptime = status.governanceNodes.totalNodes > 0
            ? (status.governanceNodes.activeNodes / status.governanceNodes.totalNodes) * 100
            : 0;
        const automatedRecovery = rpc.rateLimitHandling.rateLimitHits > 0 &&
            rpc.rateLimitHandling.successfulRequests > rpc.rateLimitHandling.failedRequests;
        return {
            rpcReliability: Math.round(rpcReliability),
            networkHealth: Math.round(networkHealth),
            systemUptime: Math.round(systemUptime),
            automatedRecovery
        };
    }
}
exports.SystemStatusService = SystemStatusService;
//# sourceMappingURL=SystemStatusService.js.map