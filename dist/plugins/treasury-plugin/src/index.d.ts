/**
 * DLoop Treasury Plugin
 *
 * Balance monitoring and financial tracking for DLoop AI governance nodes
 */
export interface TreasuryAction {
    name: string;
    description: string;
    handler: (context: any) => Promise<any>;
}
/**
 * Treasury Status Action
 */
export declare const treasuryStatusAction: TreasuryAction;
/**
 * Treasury Provider - Get financial context
 */
export declare const treasuryProvider: {
    name: string;
    description: string;
    get: (runtime: any, message: any) => Promise<string>;
};
/**
 * Main treasury plugin export
 */
export declare const treasuryPlugin: {
    name: string;
    description: string;
    actions: TreasuryAction[];
    providers: {
        name: string;
        description: string;
        get: (runtime: any, message: any) => Promise<string>;
    }[];
};
export default treasuryPlugin;
//# sourceMappingURL=index.d.ts.map