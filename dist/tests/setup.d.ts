export declare const testUtils: {
    createMockWallet: () => {
        address: string;
        privateKey: string;
        connect: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
        getBalance: import("jest-mock").Mock<() => Promise<string>>;
        estimateGas: import("jest-mock").Mock<() => Promise<string>>;
        sendTransaction: import("jest-mock").Mock<() => Promise<{
            hash: string;
            wait: import("jest-mock").Mock<() => Promise<{
                status: number;
            }>>;
        }>>;
    };
    createMockProvider: () => {
        getNetwork: import("jest-mock").Mock<() => Promise<{
            chainId: number;
            name: string;
        }>>;
        getBalance: import("jest-mock").Mock<() => Promise<string>>;
        getGasPrice: import("jest-mock").Mock<() => Promise<string>>;
        estimateGas: import("jest-mock").Mock<() => Promise<string>>;
        call: import("jest-mock").Mock<() => Promise<string>>;
        getBlockNumber: import("jest-mock").Mock<() => Promise<number>>;
    };
};
declare global {
    var testUtils: {
        createMockWallet: () => any;
        createMockProvider: () => any;
        mockEnvironmentVariables: () => void;
        cleanupEnvironmentVariables: () => void;
    };
}
export default testUtils;
//# sourceMappingURL=setup.d.ts.map