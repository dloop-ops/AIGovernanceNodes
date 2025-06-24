#!/usr/bin/env node
/**
 * 🤖 DLoop AI Governance Nodes - Enhanced Edition
 *
 * Autonomous AI agents for DAO governance with enhanced features
 * Manages 5 distributed governance nodes with conservative investment strategy
 */
import dotenv from "dotenv";
import { NodeManager } from './nodes/NodeManager.js';
import { WebServer } from './web/server.js';
import logger from './utils/logger.js';
import { GovernanceError } from './types/index.js';
import { createServer } from 'http';
// Load environment variables
dotenv.config();
/**
 * Enhanced Governance Application with elizaOS-ready architecture
 */
class DLoopGovernanceAgent {
    nodeManager;
    webServer;
    isShuttingDown = false;
    version = "2.0.0-enhanced";
    constructor() {
        this.nodeManager = new NodeManager();
        this.webServer = new WebServer(this.nodeManager);
        this.setupSignalHandlers();
        this.setupErrorHandlers();
    }
    /**
     * Find an available port dynamically, starting at 5001 to avoid common conflicts
     */
    findAvailablePort(startPort = 5001) {
        return new Promise((resolve, reject) => {
            const server = createServer();
            server.listen(startPort, () => {
                const port = server.address()?.port || startPort;
                server.close(() => resolve(port));
            });
            server.on('error', (err) => {
                if (err.code === 'EADDRINUSE') {
                    // Port is in use, try the next one
                    this.findAvailablePort(startPort + 1).then(resolve).catch(reject);
                }
                else {
                    reject(err);
                }
            });
        });
    }
    /**
     * Enhanced startup process with elizaOS-ready features
     */
    async initialize() {
        try {
            console.log('🚀 Initializing DLoop AI Governance Nodes - Enhanced Edition...\n');
            logger.info('Starting Enhanced AI Governance System', {
                version: this.version,
                environment: {
                    nodeEnv: process.env.NODE_ENV || 'development',
                    network: process.env.ETHEREUM_NETWORK || 'sepolia',
                    logLevel: process.env.LOG_LEVEL || 'info'
                }
            });
            // Validate required environment variables
            this.validateEnvironment();
            // Find an available port dynamically, avoiding port 5000 conflicts
            const availablePort = await this.findAvailablePort(5001);
            logger.info(`🌐 Using port ${availablePort} for web server`);
            // Start the web server with the available port
            await this.webServer.start(availablePort);
            // Add delay to prevent overwhelming RPC providers during startup
            logger.info('⏳ Initializing with startup delay to prevent RPC rate limiting...');
            await new Promise(resolve => setTimeout(resolve, 2000));
            // Start the node manager (this can take longer)
            await this.nodeManager.start();
            console.log('\n🎉 DLoop AI Governance Nodes are now OPERATIONAL!');
            console.log('====================================================');
            console.log('🤖 System: Enhanced AI Governance System');
            console.log(`📊 Version: ${this.version}`);
            console.log(`📡 Web Interface: http://localhost:${availablePort}`);
            console.log('🔗 Network: Sepolia Testnet');
            console.log('💰 Strategy: Conservative');
            console.log('📈 Nodes: 5 AI governance nodes');
            console.log('====================================================\n');
            // Log initial status
            const initialStatus = this.nodeManager.getSystemStatus();
            logger.info('✅ Initial System Status:', initialStatus);
            logger.info('🚀 Enhanced governance system started successfully and ready for DAO participation');
        }
        catch (error) {
            logger.error('❌ Failed to initialize governance system:', error);
            throw error;
        }
    }
    /**
     * Start the enhanced governance system
     */
    async start() {
        await this.initialize();
        // Keep the process running
        process.stdin.resume();
    }
    /**
     * Stop the application gracefully
     */
    async stop() {
        if (this.isShuttingDown) {
            logger.warn('Shutdown already in progress');
            return;
        }
        this.isShuttingDown = true;
        try {
            logger.info('🛑 Shutting down Enhanced AI Governance System');
            // Stop the web server
            await this.webServer.stop();
            // Stop the node manager
            await this.nodeManager.stop();
            logger.info('✅ Enhanced governance system shutdown completed successfully');
            process.exit(0);
        }
        catch (error) {
            logger.error('❌ Error during enhanced system shutdown', {
                error: error instanceof Error ? error.message : String(error)
            });
            process.exit(1);
        }
    }
    /**
     * Validate required environment variables
     */
    validateEnvironment() {
        const requiredEnvVars = [
            'AI_NODE_1_PRIVATE_KEY',
            'AI_NODE_2_PRIVATE_KEY',
            'AI_NODE_3_PRIVATE_KEY',
            'AI_NODE_4_PRIVATE_KEY',
            'AI_NODE_5_PRIVATE_KEY',
            'ETHEREUM_RPC_URL'
        ];
        const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
        if (missingVars.length > 0) {
            throw new GovernanceError(`Missing required environment variables: ${missingVars.join(', ')}`, 'MISSING_ENV_VARS');
        }
        // Validate private key formats
        for (let i = 1; i <= 5; i++) {
            const key = process.env[`AI_NODE_${i}_PRIVATE_KEY`];
            if (key) {
                let normalizedKey = key.trim();
                if (!normalizedKey.startsWith('0x')) {
                    normalizedKey = '0x' + normalizedKey;
                }
                if (normalizedKey.length !== 66) {
                    throw new GovernanceError(`Invalid private key format for AI_NODE_${i}_PRIVATE_KEY. Expected 64 hex characters (with or without 0x prefix)`, 'INVALID_PRIVATE_KEY');
                }
            }
        }
        // Validate RPC URL
        const rpcUrl = process.env.ETHEREUM_RPC_URL;
        if (rpcUrl && !rpcUrl.startsWith('http')) {
            throw new GovernanceError('ETHEREUM_RPC_URL must start with http:// or https://', 'INVALID_RPC_URL');
        }
        logger.info('✅ Environment validation completed successfully');
    }
    /**
     * Setup signal handlers for graceful shutdown
     */
    setupSignalHandlers() {
        const signals = ['SIGINT', 'SIGTERM', 'SIGUSR2'];
        signals.forEach(signal => {
            process.on(signal, async () => {
                logger.info(`Received ${signal}, initiating graceful shutdown`);
                await this.stop();
            });
        });
    }
    /**
     * Setup global error handlers
     */
    setupErrorHandlers() {
        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            logger.error('❌ Uncaught Exception:', {
                error: error.message,
                stack: error.stack
            });
            // Try to shutdown gracefully, but force exit if it takes too long
            setTimeout(() => {
                logger.error('🚨 Forced exit due to uncaught exception');
                process.exit(1);
            }, 5000);
            this.stop();
        });
        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            logger.error('❌ Unhandled Rejection:', {
                reason: reason instanceof Error ? reason.message : String(reason),
                stack: reason instanceof Error ? reason.stack : undefined,
                promise: promise
            });
            // Try to shutdown gracefully
            this.stop();
        });
        // Handle warnings
        process.on('warning', (warning) => {
            logger.warn('⚠️ Process Warning:', {
                name: warning.name,
                message: warning.message,
                stack: warning.stack
            });
        });
    }
    /**
     * Get enhanced application status
     */
    async getStatus() {
        return {
            status: 'operational',
            version: this.version,
            runtime: this.nodeManager.isManagerRunning(),
            uptime: process.uptime(),
            nodeManager: this.nodeManager.getSystemStatus(),
            timestamp: new Date().toISOString(),
            framework: 'Enhanced with elizaOS-ready architecture'
        };
    }
}
// CLI execution
async function main() {
    const agent = new DLoopGovernanceAgent();
    // Handle CLI commands
    const command = process.argv[2];
    switch (command) {
        case 'status': {
            const status = await agent.getStatus();
            console.log(JSON.stringify(status, null, 2));
            break;
        }
        case 'health':
            console.log('🏥 Running health check...');
            try {
                await agent.initialize();
                console.log('✅ Health check passed - Enhanced governance system operational');
                process.exit(0);
            }
            catch (error) {
                console.error('❌ Health check failed:', error);
                process.exit(1);
            }
            break;
        default:
            // Default: start the agent
            console.log('🤖 Starting Enhanced DLoop AI Governance Nodes...');
            await agent.start();
            break;
    }
}
// Export for module usage
export { DLoopGovernanceAgent };
// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch((error) => {
        console.error('❌ Enhanced governance system failed:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=index.js.map