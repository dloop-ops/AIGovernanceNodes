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
export declare const multiNodeVoteAction: VotingAction;
export declare const votingEvaluator: VotingEvaluator;
export declare const votingPlugin: {
    name: string;
    description: string;
    actions: VotingAction[];
    evaluators: VotingEvaluator[];
};
export default votingPlugin;
//# sourceMappingURL=index.d.ts.map