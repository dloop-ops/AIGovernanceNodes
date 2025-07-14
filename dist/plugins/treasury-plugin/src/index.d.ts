export interface TreasuryAction {
    name: string;
    description: string;
    handler: (context: any) => Promise<any>;
}
export declare const treasuryStatusAction: TreasuryAction;
export declare const treasuryProvider: {
    name: string;
    description: string;
    get: (runtime: any, message: any) => Promise<string>;
};
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