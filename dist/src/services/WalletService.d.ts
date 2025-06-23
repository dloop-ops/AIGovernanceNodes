import { ethers } from 'ethers';
export declare class WalletService {
    private wallets;
    private provider;
    constructor();
    private initializeProvider;
    private loadWallets;
    /**
     * Validate private key security characteristics
     */
    private validatePrivateKeySecurity;
    /**
     * Get wallet by node index
     */
    getWallet(nodeIndex: number): ethers.Wallet;
    /**
     * Get wallet by address
     */
    getWalletByAddress(address: string): ethers.Wallet | undefined;
    /**
     * Get all wallet addresses
     */
    getAllAddresses(): string[];
    /**
     * Get wallet balance
     */
    getBalance(nodeIndex: number): Promise<string>;
    /**
     * Get all wallet balances
     */
    getAllBalances(): Promise<Array<{
        nodeIndex: number;
        address: string;
        balance: string;
    }>>;
    /**
     * Validate wallet connectivity
     */
    validateConnectivity(): Promise<boolean>;
    /**
     * Get provider instance
     */
    getProvider(): ethers.Provider;
    /**
     * Estimate gas for a transaction
     */
    estimateGas(nodeIndex: number, to: string, data: string, value?: string): Promise<bigint>;
    /**
     * Get current gas price
     */
    getGasPrice(): Promise<bigint>;
    /**
     * Check if address is one of our managed wallets
     */
    isManaged(address: string): boolean;
    /**
     * Get wallet count
     */
    getWalletCount(): number;
    /**
     * Get all wallets (for admin purposes only)
     */
    getAllWallets(): ethers.Wallet[];
}
//# sourceMappingURL=WalletService.d.ts.map