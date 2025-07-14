#!/usr/bin/env node
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DLoopGovernanceAgent = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const NodeManager_js_1 = require("./nodes/NodeManager.js");
const server_js_1 = require("./web/server.js");
const logger_js_1 = __importDefault(require("./utils/logger.js"));
const index_js_1 = require("./types/index.js");
const http_1 = require("http");
const process_1 = __importDefault(require("process"));
dotenv_1.default.config();
class DLoopGovernanceAgent {
    constructor() {
        this.isShuttingDown = false;
        this.version = "2.0.0-enhanced";
        this.nodeManager = new NodeManager_js_1.NodeManager();
        this.webServer = new server_js_1.WebServer(this.nodeManager);
        this.setupSignalHandlers();
        this.setupErrorHandlers();
    }
    findAvailablePort(startPort = 5001) {
        return new Promise((resolve, reject) => {
            const server = (0, http_1.createServer)();
            server.listen(startPort, () => {
                const port = server.address()?.port || startPort;
                server.close(() => resolve(port));
            });
            server.on('error', (err) => {
                if (err.code === 'EADDRINUSE') {
                    this.findAvailablePort(startPort + 1).then(resolve).catch(reject);
                }
                else {
                    reject(err);
                }
            });
        });
    }
    async initialize() {
        try {
            console.log('🚀 Initializing DLoop AI Governance Nodes - Enhanced Edition...\n');
            logger_js_1.default.info('Starting Enhanced AI Governance System', {
                version: this.version,
                environment: {
                    nodeEnv: process_1.default.env.NODE_ENV || 'development',
                    network: process_1.default.env.ETHEREUM_NETWORK || 'sepolia',
                    logLevel: process_1.default.env.LOG_LEVEL || 'info'
                }
            });
            this.validateEnvironment();
            const availablePort = await this.findAvailablePort(5001);
            logger_js_1.default.info(`🌐 Using port ${availablePort} for web server`);
            await this.webServer.start(availablePort);
            logger_js_1.default.info('⏳ Initializing with extended startup delay to prevent RPC rate limiting...');
            await new Promise(resolve => setTimeout(resolve, 5000));
            logger_js_1.default.info('🔗 Starting RPC connection initialization...');
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
            const initialStatus = this.nodeManager.getSystemStatus();
            logger_js_1.default.info('✅ Initial System Status:', initialStatus);
            logger_js_1.default.info('🚀 Enhanced governance system started successfully and ready for DAO participation');
        }
        catch (error) {
            logger_js_1.default.error('❌ Failed to initialize governance system:', error);
            throw error;
        }
    }
    async start() {
        await this.initialize();
        process_1.default.stdin.resume();
    }
    async stop() {
        if (this.isShuttingDown) {
            logger_js_1.default.warn('Shutdown already in progress');
            return;
        }
        this.isShuttingDown = true;
        try {
            logger_js_1.default.info('🛑 Shutting down Enhanced AI Governance System');
            await this.webServer.stop();
            await this.nodeManager.stop();
            logger_js_1.default.info('✅ Enhanced governance system shutdown completed successfully');
            process_1.default.exit(0);
        }
        catch (error) {
            logger_js_1.default.error('❌ Error during enhanced system shutdown', {
                error: error instanceof Error ? error.message : String(error)
            });
            process_1.default.exit(1);
        }
    }
    validateEnvironment() {
        const requiredEnvVars = [
            'AI_NODE_1_PRIVATE_KEY',
            'AI_NODE_2_PRIVATE_KEY',
            'AI_NODE_3_PRIVATE_KEY',
            'AI_NODE_4_PRIVATE_KEY',
            'AI_NODE_5_PRIVATE_KEY'
        ];
        const missingVars = requiredEnvVars.filter(varName => !process_1.default.env[varName]);
        if (missingVars.length > 0) {
            throw new index_js_1.GovernanceError(`Missing required environment variables: ${missingVars.join(', ')}`, 'MISSING_ENV_VARS');
        }
        if (!process_1.default.env.ETHEREUM_RPC_URL && !process_1.default.env.INFURA_SEPOLIA_URL) {
            logger_js_1.default.warn('No RPC URL provided, will use default endpoints with conservative rate limiting');
            process_1.default.env.ETHEREUM_RPC_URL = 'https://sepolia.infura.io/v3/ca485bd6567e4c5fb5693ee66a5885d8';
        }
        for (let i = 1; i <= 5; i++) {
            const key = process_1.default.env[`AI_NODE_${i}_PRIVATE_KEY`];
            if (key) {
                let normalizedKey = key.trim();
                if (!normalizedKey.startsWith('0x')) {
                    normalizedKey = '0x' + normalizedKey;
                }
                if (normalizedKey.length !== 66) {
                    throw new index_js_1.GovernanceError(`Invalid private key format for AI_NODE_${i}_PRIVATE_KEY. Expected 64 hex characters (with or without 0x prefix)`, 'INVALID_PRIVATE_KEY');
                }
            }
        }
        const rpcUrl = process_1.default.env.ETHEREUM_RPC_URL;
        if (rpcUrl && !rpcUrl.startsWith('http')) {
            throw new index_js_1.GovernanceError('ETHEREUM_RPC_URL must start with http:// or https://', 'INVALID_RPC_URL');
        }
        logger_js_1.default.info('✅ Environment validation completed successfully');
    }
    setupSignalHandlers() {
        const signals = ['SIGINT', 'SIGTERM', 'SIGUSR2'];
        signals.forEach(signal => {
            process_1.default.on(signal, async () => {
                logger_js_1.default.info(`Received ${signal}, initiating graceful shutdown`);
                await this.stop();
            });
        });
    }
    setupErrorHandlers() {
        process_1.default.on('uncaughtException', (error) => {
            logger_js_1.default.error('❌ Uncaught Exception:', {
                error: error.message,
                stack: error.stack
            });
            setTimeout(() => {
                logger_js_1.default.error('🚨 Forced exit due to uncaught exception');
                process_1.default.exit(1);
            }, 5000);
            this.stop();
        });
        process_1.default.on('unhandledRejection', (reason, promise) => {
            logger_js_1.default.error('❌ Unhandled Rejection:', {
                reason: reason instanceof Error ? reason.message : String(reason),
                stack: reason instanceof Error ? reason.stack : undefined,
                promise: promise
            });
            this.stop();
        });
        process_1.default.on('warning', (warning) => {
            logger_js_1.default.warn('⚠️ Process Warning:', {
                name: warning.name,
                message: warning.message,
                stack: warning.stack
            });
        });
    }
    async getStatus() {
        return {
            status: 'operational',
            version: this.version,
            runtime: this.nodeManager.isManagerRunning(),
            uptime: process_1.default.uptime(),
            nodeManager: this.nodeManager.getSystemStatus(),
            timestamp: new Date().toISOString(),
            framework: 'Enhanced with elizaOS-ready architecture'
        };
    }
}
exports.DLoopGovernanceAgent = DLoopGovernanceAgent;
async function main() {
    try {
        logger_js_1.default.info('🤖 Starting Enhanced DLoop AI Governance Nodes...');
        logger_js_1.default.info('🚀 Initializing DLoop AI Governance Nodes - Enhanced Edition...');
        const requiredEnvVars = [
            'ETHEREUM_RPC_URL',
            'AI_NODE_1_PRIVATE_KEY',
            'AI_NODE_2_PRIVATE_KEY',
            'AI_NODE_3_PRIVATE_KEY',
            'AI_NODE_4_PRIVATE_KEY',
            'AI_NODE_5_PRIVATE_KEY'
        ];
        const missingVars = requiredEnvVars.filter(varName => !process_1.default.env[varName]);
        if (missingVars.length > 0) {
            logger_js_1.default.error(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
            logger_js_1.default.info('📝 Please check your .env file or environment configuration');
            process_1.default.exit(1);
        }
        logger_js_1.default.info('🔗 Testing RPC connections...');
        const { rpcManager } = await Promise.resolve().then(() => __importStar(require('./utils/RpcConnectionManager.js')));
        await rpcManager.validateAllProviders();
        const agent = new DLoopGovernanceAgent();
        const command = process_1.default.argv[2];
        switch (command) {
            case 'status': {
                const status = await agent.getStatus();
                console.log(JSON.stringify(status, null, 2));
                process_1.default.exit(0);
                break;
            }
            case 'health':
                console.log('🏥 Running health check...');
                try {
                    await agent.initialize();
                    console.log('✅ Health check passed - Enhanced governance system operational');
                    process_1.default.exit(0);
                }
                catch (error) {
                    console.error('❌ Health check failed:', error);
                    process_1.default.exit(1);
                }
                break;
            default:
                console.log('🤖 Starting Enhanced DLoop AI Governance Nodes...');
                await agent.start();
                break;
        }
    }
    catch (error) {
        console.error('❌ Main function failed:', error);
        process_1.default.exit(1);
    }
}
const isMainModule = process_1.default.argv[1] && process_1.default.argv[1].endsWith('index.js');
if (isMainModule || process_1.default.env.NODE_ENV !== 'test') {
    main().catch((error) => {
        console.error('❌ Enhanced governance system failed:', error);
        process_1.default.exit(1);
    });
}
//# sourceMappingURL=index.js.map