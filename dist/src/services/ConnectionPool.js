import { ethers } from 'ethers';
import { contractLogger as logger } from '../utils/logger.js';
export class ConnectionPool {
    connections = new Map();
    maxConnectionsPerEndpoint = 3;
    connectionTimeout = 10000;
    healthCheckInterval = null;
    constructor() {
        this.initializeConnections();
        this.startHealthChecking();
    }
    initializeConnections() {
        const endpoints = [
            { name: 'Primary_Infura', url: process.env.INFURA_SEPOLIA_URL || 'https://sepolia.infura.io/v3/ca485bd6567e4c5fb5693ee66a5885d8' },
            { name: 'Secondary_Infura', url: 'https://sepolia.infura.io/v3/60755064a92543a1ac7aaf4e20b71cdf' },
            { name: 'Tenderly', url: 'https://sepolia.gateway.tenderly.co/public' },
            { name: 'Ethereum_Public', url: 'https://ethereum-sepolia-rpc.publicnode.com' }
        ];
        endpoints.forEach(endpoint => {
            if (endpoint.url && !endpoint.url.includes('undefined')) {
                const connections = [];
                for (let i = 0; i < this.maxConnectionsPerEndpoint; i++) {
                    try {
                        const provider = new ethers.JsonRpcProvider(endpoint.url, {
                            name: 'sepolia',
                            chainId: 11155111
                        }, {
                            polling: false,
                            staticNetwork: ethers.Network.from('sepolia')
                        });
                        connections.push({
                            provider,
                            isHealthy: true,
                            lastUsed: 0,
                            errorCount: 0,
                            connectionId: `${endpoint.name}_${i}`
                        });
                    }
                    catch (error) {
                        logger.warn('Failed to create connection', {
                            component: 'contract',
                            endpoint: endpoint.name,
                            connectionIndex: i,
                            error: error instanceof Error ? error.message : 'Unknown error'
                        });
                    }
                }
                if (connections.length > 0) {
                    this.connections.set(endpoint.name, connections);
                    logger.info('Connection pool initialized', {
                        component: 'contract',
                        endpoint: endpoint.name,
                        connections: connections.length
                    });
                }
            }
        });
    }
    getHealthyConnection() {
        const allConnections = Array.from(this.connections.entries()).flatMap(([name, conns]) => conns.filter(conn => conn.isHealthy).map(conn => ({ ...conn, endpointName: name })));
        if (allConnections.length === 0) {
            logger.error('No healthy connections available in pool');
            return null;
        }
        // Sort by last used (least recently used first) and error count
        allConnections.sort((a, b) => {
            if (a.errorCount !== b.errorCount) {
                return a.errorCount - b.errorCount;
            }
            return a.lastUsed - b.lastUsed;
        });
        const selected = allConnections[0];
        selected.lastUsed = Date.now();
        logger.debug('Selected connection from pool', {
            endpoint: selected.endpointName,
            connectionId: selected.connectionId,
            errorCount: selected.errorCount
        });
        return selected.provider;
    }
    async executeWithPool(operation, maxRetries = 3) {
        let lastError = null;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            const connection = this.getHealthyConnection();
            if (!connection) {
                await this.attemptConnectionRecovery();
                continue;
            }
            try {
                const result = await Promise.race([
                    operation(connection),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Operation timeout')), this.connectionTimeout))
                ]);
                return result;
            }
            catch (error) {
                lastError = error;
                // Mark connection as unhealthy if it's a connection-related error
                if (this.isConnectionError(error)) {
                    this.markConnectionUnhealthy(connection);
                }
                logger.warn('Pool operation failed', {
                    attempt,
                    maxRetries,
                    error: error.message
                });
                if (attempt < maxRetries) {
                    await this.delay(Math.pow(2, attempt) * 1000);
                }
            }
        }
        throw lastError || new Error('All pool operations failed');
    }
    isConnectionError(error) {
        const message = error.message?.toLowerCase() || '';
        return (message.includes('network') ||
            message.includes('timeout') ||
            message.includes('connection') ||
            message.includes('enotfound') ||
            message.includes('econnreset') ||
            message.includes('failed to detect network') ||
            error.code === 'NETWORK_ERROR' ||
            error.code === 'TIMEOUT');
    }
    markConnectionUnhealthy(provider) {
        for (const [endpointName, connections] of this.connections.entries()) {
            const connection = connections.find(conn => conn.provider === provider);
            if (connection) {
                connection.isHealthy = false;
                connection.errorCount++;
                logger.warn('Marked connection as unhealthy', {
                    endpoint: endpointName,
                    connectionId: connection.connectionId,
                    errorCount: connection.errorCount
                });
                break;
            }
        }
    }
    async attemptConnectionRecovery() {
        logger.info('Attempting connection pool recovery');
        // Reset all connections with high error counts
        for (const [endpointName, connections] of this.connections.entries()) {
            connections.forEach(conn => {
                if (conn.errorCount > 5) {
                    conn.errorCount = 0;
                    conn.isHealthy = true;
                    logger.info('Reset connection for recovery', {
                        endpoint: endpointName,
                        connectionId: conn.connectionId
                    });
                }
            });
        }
        await this.delay(5000); // Wait 5 seconds before retry
    }
    startHealthChecking() {
        this.healthCheckInterval = setInterval(async () => {
            await this.performHealthChecks();
        }, 60000); // Check every minute
    }
    async performHealthChecks() {
        // Use sequential health checks to avoid batch request limits
        for (const [endpointName, connections] of this.connections.entries()) {
            for (const connection of connections) {
                try {
                    await this.checkConnectionHealth(endpointName, connection);
                    // Small delay between connection checks
                    await new Promise(resolve => setTimeout(resolve, 50));
                }
                catch (error) {
                    logger.debug('Connection health check failed', {
                        endpoint: endpointName,
                        connectionId: connection.connectionId,
                        error
                    });
                }
            }
        }
    }
    async checkConnectionHealth(endpointName, connection) {
        try {
            await Promise.race([
                connection.provider.getBlockNumber(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Health check timeout')), 5000))
            ]);
            if (!connection.isHealthy) {
                connection.isHealthy = true;
                connection.errorCount = Math.max(0, connection.errorCount - 1);
                logger.info('Connection recovered', {
                    endpoint: endpointName,
                    connectionId: connection.connectionId
                });
            }
        }
        catch (error) {
            connection.isHealthy = false;
            connection.errorCount++;
            logger.debug('Health check failed', {
                endpoint: endpointName,
                connectionId: connection.connectionId,
                errorCount: connection.errorCount
            });
        }
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    getPoolStatus() {
        const status = {};
        for (const [endpointName, connections] of this.connections.entries()) {
            const healthy = connections.filter(conn => conn.isHealthy).length;
            status[endpointName] = {
                healthy,
                total: connections.length
            };
        }
        return status;
    }
    stop() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
        logger.info('Connection pool stopped');
    }
}
//# sourceMappingURL=ConnectionPool.js.map