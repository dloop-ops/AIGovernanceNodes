import { createServer } from 'http';
import logger from '../utils/logger.js';
export class WebServer {
    server;
    nodeManager;
    port;
    constructor(nodeManager) {
        this.nodeManager = nodeManager;
        // Use environment variable PORT, fallback to 5001 to avoid conflict with common port 5000
        this.port = process.env.PORT ? parseInt(process.env.PORT) : 5001;
    }
    /**
     * Start the web server with optional port override
     */
    start(portOverride) {
        return new Promise((resolve, reject) => {
            // Use override port if provided, otherwise use instance port
            const targetPort = portOverride || this.port;
            this.server = createServer((req, res) => {
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Access-Control-Allow-Origin', '*');
                if (req.url === '/') {
                    this.handleStatus(res);
                }
                else if (req.url === '/health') {
                    this.handleHealth(res);
                }
                else if (req.url === '/nodes') {
                    this.handleNodes(res);
                }
                else if (req.url === '/trigger-voting' && req.method === 'POST') {
                    this.handleTriggerVoting(res);
                }
                else if (req.url === '/emergency-voting' && req.method === 'POST') {
                    this.handleEmergencyVoting(res);
                }
                else if (req.url === '/active-proposals') {
                    this.handleActiveProposals(res);
                }
                else {
                    res.writeHead(404);
                    res.end(JSON.stringify({ error: 'Not Found' }));
                }
            });
            this.server.on('error', (error) => {
                if (error.code === 'EADDRINUSE') {
                    logger.warn(`Port ${targetPort} is in use, retrying with next port...`);
                    // If we're using an override port, try the next one
                    if (portOverride) {
                        this.start(portOverride + 1).then(resolve).catch(reject);
                    }
                    else {
                        this.port += 1;
                        setTimeout(() => {
                            this.server.listen(this.port);
                        }, 100);
                    }
                }
                else {
                    logger.error('Web server error:', error);
                    reject(error);
                }
            });
            this.server.listen(targetPort, () => {
                this.port = targetPort; // Update instance port to the actually used port
                logger.info(`Web server started on port ${targetPort}`);
                resolve();
            });
        });
    }
    handleStatus(res) {
        const status = this.nodeManager.getSystemStatus();
        res.writeHead(200);
        res.end(JSON.stringify({
            message: 'AI Governance Nodes System',
            status: 'operational',
            timestamp: new Date().toISOString(),
            system: status
        }, null, 2));
    }
    handleHealth(res) {
        res.writeHead(200);
        res.end(JSON.stringify({
            status: 'healthy',
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
        }));
    }
    handleNodes(res) {
        const nodes = Array.from(this.nodeManager.getAllNodes().values()).map(node => {
            const status = node.getStatus();
            return {
                id: node.getNodeId(),
                address: status.address,
                active: node.isNodeActive(),
                status: status
            };
        });
        res.writeHead(200);
        res.end(JSON.stringify({ nodes }, null, 2));
    }
    async handleTriggerVoting(res) {
        try {
            logger.info('Manual voting trigger requested via API');
            // Execute immediate voting round
            await this.nodeManager.triggerVotingRound();
            res.writeHead(200);
            res.end(JSON.stringify({
                success: true,
                message: 'Voting round triggered successfully',
                timestamp: new Date().toISOString()
            }));
        }
        catch (error) {
            logger.error('Failed to trigger voting round', { error });
            res.writeHead(500);
            res.end(JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : String(error)
            }));
        }
    }
    async handleEmergencyVoting(res) {
        try {
            logger.info('🚨 Emergency voting trigger requested via API');
            // For now, use the existing NodeManager trigger voting as emergency fallback
            // TODO: Integrate proper emergency service when NodeManager exposes services
            await this.nodeManager.triggerVotingRound();
            res.writeHead(200);
            res.end(JSON.stringify({
                success: true,
                message: 'Emergency voting round triggered (using existing mechanism)',
                details: {
                    method: 'nodeManager.triggerVotingRound',
                    timestamp: new Date().toISOString()
                },
                timestamp: new Date().toISOString()
            }));
        }
        catch (error) {
            logger.error('🚨 Emergency voting failed', { error });
            res.writeHead(500);
            res.end(JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : String(error),
                timestamp: new Date().toISOString()
            }));
        }
    }
    async handleActiveProposals(res) {
        try {
            // Get active proposals from one of the nodes
            const nodes = Array.from(this.nodeManager.getAllNodes().values());
            if (nodes.length === 0) {
                throw new Error('No nodes available');
            }
            const activeProposals = await this.nodeManager.getActiveProposals();
            res.writeHead(200);
            res.end(JSON.stringify({
                success: true,
                proposals: activeProposals,
                count: activeProposals.length,
                timestamp: new Date().toISOString()
            }, null, 2));
        }
        catch (error) {
            logger.error('Failed to fetch active proposals', { error });
            res.writeHead(500);
            res.end(JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : String(error)
            }));
        }
    }
    stop() {
        return new Promise((resolve) => {
            if (this.server) {
                this.server.close(() => {
                    logger.info('Web server stopped');
                    resolve();
                });
            }
            else {
                resolve();
            }
        });
    }
}
//# sourceMappingURL=server.js.map