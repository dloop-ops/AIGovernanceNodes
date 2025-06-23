import { NodeManager } from '../nodes/NodeManager.js';
export declare class WebServer {
    private server;
    private nodeManager;
    private port;
    constructor(nodeManager: NodeManager);
    /**
     * Start the web server with optional port override
     */
    start(portOverride?: number): Promise<void>;
    private handleStatus;
    private handleHealth;
    private handleNodes;
    private handleTriggerVoting;
    private handleEmergencyVoting;
    private handleActiveProposals;
    stop(): Promise<void>;
}
//# sourceMappingURL=server.d.ts.map