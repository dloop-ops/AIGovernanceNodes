/**
 * DLoop Governance Plugin
 *
 * Core governance functionality for DLoop AI nodes
 * Handles proposal analysis, voting decisions, and multi-node coordination
 */
export interface GovernanceAction {
    name: string;
    description: string;
    handler: (context: any) => Promise<any>;
}
export interface GovernanceEvaluator {
    name: string;
    description: string;
    handler: (context: any) => Promise<any>;
}
export interface GovernanceProvider {
    name: string;
    description: string;
    get: (runtime: any, message: any) => Promise<any>;
}
/**
 * Enhanced Governance Action - Analyzes and votes on proposals
 */
export declare const governanceVoteAction: GovernanceAction;
/**
 * Governance Status Provider - Provides current governance information
 */
export declare const governanceStatusProvider: GovernanceProvider;
/**
 * Governance Evaluator - Assesses governance-related conversations
 */
export declare const governanceEvaluator: GovernanceEvaluator;
/**
 * Main governance plugin export
 */
export declare const governancePlugin: {
    name: string;
    description: string;
    actions: GovernanceAction[];
    evaluators: GovernanceEvaluator[];
    providers: GovernanceProvider[];
};
export default governancePlugin;
//# sourceMappingURL=index.d.ts.map