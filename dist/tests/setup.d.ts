declare global {
    var testUtils: {
        generateMockWallet: () => {
            address: string;
            privateKey: string;
        };
        generateMockContract: () => {
            address: string;
        };
    };
}
export {};
//# sourceMappingURL=setup.d.ts.map