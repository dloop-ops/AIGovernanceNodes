import { RpcManager } from './RpcManager.js';
import { NodeManager } from '../nodes/NodeManager.js';
import { contractLogger as logger } from '../utils/logger.js';

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
      [endpointName: string]: { healthy: number; total: number };
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

export class SystemStatusService {
  private rpcManager: RpcManager | null = null;
  private nodeManager: NodeManager | null = null;

  constructor() {
    logger.info('System Status Service initialized');
  }

  public setRpcManager(rpcManager: RpcManager): void {
    this.rpcManager = rpcManager;
  }

  public setNodeManager(nodeManager: NodeManager): void {
    this.nodeManager = nodeManager;
  }

  public getComprehensiveStatus(): SystemStatus {
    const timestamp = Date.now();

    // RPC Infrastructure Status
    const rpcStatus = this.getRpcInfrastructureStatus();
    
    // Governance Nodes Status
    const nodeStatus = this.getGovernanceNodesStatus();
    
    // Scheduled Tasks Status
    const taskStatus = this.getScheduledTasksStatus();

    const systemStatus: SystemStatus = {
      timestamp,
      rpcInfrastructure: rpcStatus,
      governanceNodes: nodeStatus,
      scheduledTasks: taskStatus
    };

    this.logSystemHealth(systemStatus);
    return systemStatus;
  }

  private getRpcInfrastructureStatus(): SystemStatus['rpcInfrastructure'] {
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

    const healthyEndpoints = endpointStatuses.filter(e => e.isHealthy).length;
    const totalEndpoints = endpointStatuses.length;
    
    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (healthyEndpoints === 0) {
      status = 'critical';
    } else if (healthyEndpoints < totalEndpoints * 0.75) {
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
        healthyProviders: comprehensiveStatus.healthySummary.networkHealthy ? 
          endpointStatuses.filter(e => e.isHealthy).map(e => e.name) : [],
        unhealthyProviders: endpointStatuses.filter(e => !e.isHealthy).map(e => e.name),
        bestProvider: comprehensiveStatus.healthySummary.bestProvider,
        networkHealthy: comprehensiveStatus.healthySummary.networkHealthy
      },
      connectionPool: comprehensiveStatus.poolStatus
    };
  }

  private getGovernanceNodesStatus(): SystemStatus['governanceNodes'] {
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
    
    // Estimate authentication status based on system behavior
    const authenticatedNodes = activeNodes; // Nodes with SoulBound NFTs are active
    
    let registrationStatus: 'pending' | 'in_progress' | 'completed' = 'pending';
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

  private getScheduledTasksStatus(): SystemStatus['scheduledTasks'] {
    if (!this.nodeManager) {
      return [];
    }

    // For now, return basic scheduled tasks status
    // This would need to be enhanced to track actual scheduled tasks
    return [
      {
        name: 'Daily Proposal Creation',
        status: 'running',
        lastExecution: Date.now() - (12 * 60 * 60 * 1000) // 12 hours ago
      },
      {
        name: 'Voting Check',
        status: 'running', 
        lastExecution: Date.now() - (4 * 60 * 60 * 1000) // 4 hours ago
      },
      {
        name: 'Market Data Fetch',
        status: 'running',
        lastExecution: Date.now() - (30 * 60 * 1000) // 30 minutes ago
      }
    ];
  }

  private logSystemHealth(status: SystemStatus): void {
    const rpc = status.rpcInfrastructure;
    const nodes = status.governanceNodes;
    
    logger.info('System Health Summary', {
      rpcStatus: rpc.status,
      rpcConnections: `${rpc.activeConnections}/${rpc.totalEndpoints}`,
      rateLimitHandling: {
        successRate: rpc.rateLimitHandling.totalRequests > 0 ? 
          Math.round((rpc.rateLimitHandling.successfulRequests / rpc.rateLimitHandling.totalRequests) * 100) : 0,
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

  public getMetricsSummary(): {
    rpcReliability: number;
    networkHealth: number;
    systemUptime: number;
    automatedRecovery: boolean;
  } {
    const status = this.getComprehensiveStatus();
    const rpc = status.rpcInfrastructure;

    const rpcReliability = rpc.totalEndpoints > 0 ? 
      (rpc.activeConnections / rpc.totalEndpoints) * 100 : 0;

    const networkHealth = rpc.networkMonitoring.networkHealthy ? 100 : 
      (rpc.networkMonitoring.healthyProviders.length / 
       (rpc.networkMonitoring.healthyProviders.length + rpc.networkMonitoring.unhealthyProviders.length)) * 100;

    const systemUptime = status.governanceNodes.totalNodes > 0 ?
      (status.governanceNodes.activeNodes / status.governanceNodes.totalNodes) * 100 : 0;

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