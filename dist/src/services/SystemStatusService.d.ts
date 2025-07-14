import { RpcManager } from './RpcManager.js';
import { NodeManager } from '../nodes/NodeManager.js';
export interface SystemStatus {
    timestamp: number;
    rpcInfrastructure: {
        status: 'healthy' | 'degraded' | 'critical';
        activeConnections: number;
        totalEndpoints: number;
        rateLimitHandling: {
            totalRequests: number;
            successfulRequests: number;
            failedRequests: number;
            rateLimitHits: number;
            averageResponseTime: number;
        };
        networkMonitoring: {
            healthyProviders: string[];
            unhealthyProviders: string[];
            bestProvider: string | null;
            networkHealthy: boolean;
        };
        connectionPool: {
            [endpointName: string]: {
                healthy: number;
                total: number;
            };
        };
    };
    governanceNodes: {
        totalNodes: number;
        activeNodes: number;
        authenticatedNodes: number;
        registrationStatus: 'pending' | 'in_progress' | 'completed';
    };
    scheduledTasks: {
        name: string;
        status: 'running' | 'stopped';
        lastExecution?: number;
    }[];
}
export declare class SystemStatusService {
    private rpcManager;
    private nodeManager;
    constructor();
    setRpcManager(rpcManager: RpcManager): void;
    setNodeManager(nodeManager: NodeManager): void;
    getComprehensiveStatus(): SystemStatus;
    private getRpcInfrastructureStatus;
    private getGovernanceNodesStatus;
    private getScheduledTasksStatus;
    private logSystemHealth;
    getMetricsSummary(): {
        rpcReliability: number;
        networkHealth: number;
        systemUptime: number;
        automatedRecovery: boolean;
    };
}
//# sourceMappingURL=SystemStatusService.d.ts.map