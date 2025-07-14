import { ethers } from 'ethers';
export declare class WalletService {
    private wallets;
    private provider;
    constructor();
    private initializeProvider;
    private loadWallets;
    private validatePrivateKeySecurity;
    getWallet(nodeIndex: number): ethers.Wallet;
    getWalletByAddress(address: string): ethers.Wallet | undefined;
    getAllAddresses(): string[];
    getBalance(nodeIndex: number): Promise<string>;
    getAllBalances(): Promise<{
        nodeIndex: number;
        address: string;
        balance: string;
    }[]>;
    validateConnectivity(): Promise<boolean>;
    getProvider(): ethers.Provider;
    estimateGas(nodeIndex: number, to: string, data: string, value?: string): Promise<bigint>;
    getGasPrice(): Promise<bigint>;
    isManaged(address: string): boolean;
    getWalletCount(): number;
    getAllWallets(): ethers.Wallet[];
}
//# sourceMappingURL=WalletService.d.ts.map