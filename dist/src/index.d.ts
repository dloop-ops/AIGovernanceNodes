#!/usr/bin/env node
/**
 * 🤖 DLoop AI Governance Nodes - Enhanced Edition
 *
 * Autonomous AI agents for DAO governance with enhanced features
 * Manages 5 distributed governance nodes with conservative investment strategy
 */
/**
 * Enhanced Governance Application with elizaOS-ready architecture
 */
declare class DLoopGovernanceAgent {
    private nodeManager;
    private webServer;
    private isShuttingDown;
    private version;
    constructor();
    /**
     * Find an available port dynamically, starting at 5001 to avoid common conflicts
     */
    private findAvailablePort;
    /**
     * Enhanced startup process with elizaOS-ready features
     */
    initialize(): Promise<void>;
    /**
     * Start the enhanced governance system
     */
    start(): Promise<void>;
    /**
     * Stop the application gracefully
     */
    stop(): Promise<void>;
    /**
     * Validate required environment variables
     */
    private validateEnvironment;
    /**
     * Setup signal handlers for graceful shutdown
     */
    private setupSignalHandlers;
    /**
     * Setup global error handlers
     */
    private setupErrorHandlers;
    /**
     * Get enhanced application status
     */
    getStatus(): Promise<object>;
}
export { DLoopGovernanceAgent };
//# sourceMappingURL=index.d.ts.map