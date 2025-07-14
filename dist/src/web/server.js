"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebServer = void 0;
const http_1 = require("http");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
class WebServer {
    constructor(nodeManager) {
        this.nodeManager = nodeManager;
        this.port = process.env.PORT ? parseInt(process.env.PORT) : 5001;
    }
    start(portOverride) {
        return new Promise((resolve, reject) => {
            const targetPort = portOverride || this.port;
            this.server = (0, http_1.createServer)((req, res) => {
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
                    logger_js_1.default.warn(`Port ${targetPort} is in use, retrying with next port...`);
                    if (portOverride) {
                        this.start(portOverride + 1)
                            .then(resolve)
                            .catch(reject);
                    }
                    else {
                        this.port += 1;
                        setTimeout(() => {
                            this.server.listen(this.port);
                        }, 100);
                    }
                }
                else {
                    logger_js_1.default.error('Web server error:', error);
                    reject(error);
                }
            });
            this.server.listen(targetPort, '0.0.0.0', () => {
                this.port = targetPort;
                logger_js_1.default.info(`Web server started on port ${targetPort}`);
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
        const nodes = Array.from(this.nodeManager.getAllNodes().values()).map((node) => {
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
            logger_js_1.default.info('Manual voting trigger requested via API');
            await this.nodeManager.triggerVotingRound();
            res.writeHead(200);
            res.end(JSON.stringify({
                success: true,
                message: 'Voting round triggered successfully',
                timestamp: new Date().toISOString()
            }));
        }
        catch (error) {
            logger_js_1.default.error('Failed to trigger voting round', { error });
            res.writeHead(500);
            res.end(JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : String(error)
            }));
        }
    }
    async handleEmergencyVoting(res) {
        try {
            logger_js_1.default.info('🚨 Emergency voting trigger requested via API');
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
            logger_js_1.default.error('🚨 Emergency voting failed', { error });
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
            logger_js_1.default.error('Failed to fetch active proposals', { error });
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
                    logger_js_1.default.info('Web server stopped');
                    resolve();
                });
            }
            else {
                resolve();
            }
        });
    }
}
exports.WebServer = WebServer;
//# sourceMappingURL=server.js.map