#!/usr/bin/env node
declare class DLoopGovernanceAgent {
    private nodeManager;
    private webServer;
    private isShuttingDown;
    private version;
    constructor();
    private findAvailablePort;
    initialize(): Promise<void>;
    start(): Promise<void>;
    stop(): Promise<void>;
    private validateEnvironment;
    private setupSignalHandlers;
    private setupErrorHandlers;
    getStatus(): Promise<object>;
}
export { DLoopGovernanceAgent };
//# sourceMappingURL=index.d.ts.map