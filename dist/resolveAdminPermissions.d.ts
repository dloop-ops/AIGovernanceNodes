declare class AdminPermissionsResolver {
    private provider;
    private soulboundAdminWallet;
    private adminRoleWallet;
    private contracts;
    private readonly contractAddresses;
    private readonly roles;
    constructor();
    private initializeContracts;
    /**
     * Check current role assignments across all contracts
     */
    analyzeCurrentRoles(): Promise<void>;
    /**
     * Grant necessary roles to resolve registration permissions
     */
    grantAdminRoles(): Promise<void>;
    /**
     * Verify that the admin permissions resolve the registration issue
     */
    testNodeRegistration(): Promise<void>;
    /**
     * Execute complete admin permissions resolution
     */
    resolvePermissions(): Promise<void>;
}
export { AdminPermissionsResolver };
//# sourceMappingURL=resolveAdminPermissions.d.ts.map