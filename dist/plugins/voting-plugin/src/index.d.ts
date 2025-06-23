/**
 * DLoop Voting Plugin
 *
 * Multi-node voting coordination for DLoop AI governance
 */
export interface VotingAction {
    name: string;
    description: string;
    handler: (context: any) => Promise<any>;
}
export interface VotingEvaluator {
    name: string;
    description: string;
    handler: (context: any) => Promise<any>;
}
/**
 * Multi-Node Voting Action
 */
export declare const multiNodeVoteAction: VotingAction;
/**
 * Voting Status Evaluator
 */
export declare const votingEvaluator: VotingEvaluator;
/**
 * Main voting plugin export
 */
export declare const votingPlugin: {
    name: string;
    description: string;
    actions: VotingAction[];
    evaluators: VotingEvaluator[];
};
export default votingPlugin;
//# sourceMappingURL=index.d.ts.map