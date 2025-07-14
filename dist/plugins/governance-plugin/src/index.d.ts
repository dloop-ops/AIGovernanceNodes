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
export declare const governanceVoteAction: GovernanceAction;
export declare const governanceStatusProvider: GovernanceProvider;
export declare const governanceEvaluator: GovernanceEvaluator;
export declare const governancePlugin: {
    name: string;
    description: string;
    actions: GovernanceAction[];
    evaluators: GovernanceEvaluator[];
    providers: GovernanceProvider[];
};
export default governancePlugin;
//# sourceMappingURL=index.d.ts.map