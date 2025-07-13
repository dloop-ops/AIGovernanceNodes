/**
 * Scheduler utility for governance operations
 * AI Governance Nodes only vote on proposals - they do not create them
 */
import { NodeManager } from '../nodes/NodeManager.js';
export declare class Scheduler {
    private nodeManager;
    constructor(nodeManager: NodeManager);
    /**
     * Start all scheduled tasks
     */
    start(): void;
    /**
     * Stop all scheduled tasks
     */
    stop(): void;
}
//# sourceMappingURL=scheduler.d.ts.map