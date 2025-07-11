import { ethers } from 'ethers';
import { getCurrentNetwork } from '../config/networks.js';
import { walletLogger as logger } from '../utils/logger.js';
import { GovernanceError } from '../types/index.js';

export class WalletService {
  private wallets: ethers.Wallet[] = [];
  private provider!: ethers.Provider;

  constructor() {
    this.initializeProvider();
    this.loadWallets();
  }

  private initializeProvider(): void {
    try {
      const network = getCurrentNetwork();
      this.provider = new ethers.JsonRpcProvider(network.rpcUrl);
      logger.info(`Provider initialized for ${network.name}`);
    } catch (error) {
      throw new GovernanceError(
        'Failed to initialize wallet provider',
        'PROVIDER_INIT_ERROR'
      );
    }
  }

  private loadWallets(): void {
    try {
      const privateKeys = [
        process.env.AI_NODE_1_PRIVATE_KEY,
        process.env.AI_NODE_2_PRIVATE_KEY,
        process.env.AI_NODE_3_PRIVATE_KEY,
        process.env.AI_NODE_4_PRIVATE_KEY,
        process.env.AI_NODE_5_PRIVATE_KEY
      ];

      for (let i = 0; i < privateKeys.length; i++) {
        const privateKey = privateKeys[i];
        if (!privateKey) {
          // In development, provide a more helpful error message
          if (process.env.NODE_ENV === 'development') {
            logger.error(`❌ Missing environment variable: AI_NODE_${i + 1}_PRIVATE_KEY`);
            logger.info(`💡 Please set the following environment variables:`);
            logger.info(`   AI_NODE_1_PRIVATE_KEY=0x...`);
            logger.info(`   AI_NODE_2_PRIVATE_KEY=0x...`);
            logger.info(`   AI_NODE_3_PRIVATE_KEY=0x...`);
            logger.info(`   AI_NODE_4_PRIVATE_KEY=0x...`);
            logger.info(`   AI_NODE_5_PRIVATE_KEY=0x...`);
            logger.info(`   ETHEREUM_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID`);
          }
          throw new GovernanceError(
            `Private key for AI Node ${i + 1} not found in environment variables`,
            'MISSING_PRIVATE_KEY'
          );
        }

        // Validate private key format and security
        this.validatePrivateKeySecurity(privateKey, i + 1);

        // Normalize private key format
        let normalizedKey = privateKey.trim();
        if (!normalizedKey.startsWith('0x')) {
          normalizedKey = '0x' + normalizedKey;
        }
        
        if (normalizedKey.length !== 66) {
          throw new GovernanceError(
            `Invalid private key format for AI Node ${i + 1}. Expected 64 hex characters (with or without 0x prefix)`,
            'INVALID_PRIVATE_KEY_FORMAT'
          );
        }

        const wallet = new ethers.Wallet(normalizedKey, this.provider);
        this.wallets.push(wallet);
        logger.info(`Wallet loaded for AI Node ${i + 1}`, {
          address: wallet.address,
          nodeIndex: i
        });
      }

      logger.info(`Successfully loaded ${this.wallets.length} wallets`);
    } catch (error) {
      if (error instanceof GovernanceError) {
        throw error;
      }
      throw new GovernanceError(
        `Failed to load wallets: ${error instanceof Error ? error.message : String(error)}`,
        'WALLET_LOAD_ERROR'
      );
    }
  }

  /**
   * Validate private key security characteristics
   */
  private validatePrivateKeySecurity(privateKey: string, nodeNumber: number): void {
    const normalized = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
    
    // Check for weak patterns (all zeros, sequential numbers, etc.)
    const weakPatterns = [
      /^0+$/, // All zeros
      /^1+$/, // All ones
      /^(0123456789abcdef)+$/i, // Sequential pattern
      /^(.)\1{10,}/, // Repeated characters
    ];

    for (const pattern of weakPatterns) {
      if (pattern.test(normalized)) {
        logger.warn(`Potentially weak private key detected for node ${nodeNumber}`);
        break;
      }
    }

    // Ensure proper entropy (basic check)
    const uniqueChars = new Set(normalized.toLowerCase()).size;
    if (uniqueChars < 8) {
      logger.warn(`Low entropy private key detected for node ${nodeNumber} (${uniqueChars} unique characters)`);
    }
  }

  /**
   * Get wallet by node index
   */
  getWallet(nodeIndex: number): ethers.Wallet {
    if (nodeIndex < 0 || nodeIndex >= this.wallets.length) {
      throw new GovernanceError(
        `Invalid node index: ${nodeIndex}. Must be between 0 and ${this.wallets.length - 1}`,
        'INVALID_NODE_INDEX'
      );
    }

    return this.wallets[nodeIndex];
  }

  /**
   * Get wallet by address
   */
  getWalletByAddress(address: string): ethers.Wallet | undefined {
    return this.wallets.find(wallet => 
      wallet.address.toLowerCase() === address.toLowerCase()
    );
  }

  /**
   * Get all wallet addresses
   */
  getAllAddresses(): string[] {
    return this.wallets.map(wallet => wallet.address);
  }

  /**
   * Get wallet balance
   */
  async getBalance(nodeIndex: number): Promise<string> {
    try {
      const wallet = this.getWallet(nodeIndex);
      const balance = await this.provider.getBalance(wallet.address);
      return ethers.formatEther(balance);
    } catch (error) {
      throw new GovernanceError(
        `Failed to get balance for node ${nodeIndex}: ${error instanceof Error ? error.message : String(error)}`,
        'BALANCE_FETCH_ERROR'
      );
    }
  }

  /**
   * Get all wallet balances
   */
  async getAllBalances(): Promise<Array<{ nodeIndex: number; address: string; balance: string }>> {
    const balances = [];
    
    for (let i = 0; i < this.wallets.length; i++) {
      try {
        const balance = await this.getBalance(i);
        balances.push({
          nodeIndex: i,
          address: this.wallets[i].address,
          balance
        });
      } catch (error) {
        logger.error(`Failed to get balance for node ${i}`, { error });
        balances.push({
          nodeIndex: i,
          address: this.wallets[i].address,
          balance: 'Error'
        });
      }
    }

    return balances;
  }

  /**
   * Validate wallet connectivity
   */
  async validateConnectivity(): Promise<boolean> {
    try {
      // First check provider network connectivity
      const network = await this.provider.getNetwork();
      logger.info('Provider connectivity validated', {
        component: 'wallet',
        chainId: network.chainId,
        networkName: network.name
      });

      // Test wallet connectivity with a sample of wallets (not all to avoid rate limiting)
      const testCount = Math.min(3, this.wallets.length);
      
      for (let i = 0; i < testCount; i++) {
        try {
          const wallet = this.wallets[i];
          const nonce = await wallet.getNonce();
          logger.debug(`Wallet ${i} connectivity validated`, {
            component: 'wallet',
            address: wallet.address,
            nonce: nonce.toString() // Convert BigInt to string immediately
          });
        } catch (walletError) {
          // Handle BigInt serialization errors specifically
          let errorMessage = walletError instanceof Error ? walletError.message : String(walletError);
          
          // Check if error contains BigInt and sanitize
          if (errorMessage.includes('BigInt') || typeof walletError === 'object' && walletError !== null) {
            errorMessage = 'Wallet nonce check failed (network or serialization error)';
          }
          
          logger.warn(`Wallet ${i} connectivity test failed`, {
            component: 'wallet',
            error: errorMessage,
            address: this.wallets[i].address
          });
          return false;
        }
      }

      logger.info('Wallet connectivity validation successful', {
        component: 'wallet',
        testedWallets: testCount,
        totalWallets: this.wallets.length
      });
      
      return true;
    } catch (error) {
      // Safely convert error to string to avoid BigInt serialization issues
      // Handle specific BigInt errors that occur during nonce checking
      let errorMessage = error instanceof Error ? error.message : String(error);
      
      // Strip out BigInt values from error messages
      if (errorMessage.includes('BigInt')) {
        errorMessage = 'Wallet connectivity check failed due to serialization error';
      }
      
      logger.error('Wallet connectivity validation failed', {
        component: 'wallet',
        error: errorMessage,
        nodeAddress: this.wallets[0]?.address || 'unknown'
      });
      return false;
    }
  }

  /**
   * Get provider instance
   */
  getProvider(): ethers.Provider {
    return this.provider;
  }

  /**
   * Estimate gas for a transaction
   */
  async estimateGas(
    nodeIndex: number,
    to: string,
    data: string,
    value?: string
  ): Promise<bigint> {
    try {
      const wallet = this.getWallet(nodeIndex);
      const tx = {
        to,
        data,
        value: value ? ethers.parseEther(value) : 0
      };

      return await wallet.estimateGas(tx);
    } catch (error) {
      throw new GovernanceError(
        `Failed to estimate gas: ${error instanceof Error ? error.message : String(error)}`,
        'GAS_ESTIMATION_ERROR'
      );
    }
  }

  /**
   * Get current gas price
   */
  async getGasPrice(): Promise<bigint> {
    try {
      const feeData = await this.provider.getFeeData();
      return feeData.gasPrice || ethers.parseUnits('20', 'gwei'); // Fallback to 20 gwei
    } catch (error) {
      logger.warn('Failed to get gas price, using fallback', { error });
      return ethers.parseUnits('20', 'gwei');
    }
  }

  /**
   * Check if address is one of our managed wallets
   */
  isManaged(address: string): boolean {
    return this.wallets.some(wallet => 
      wallet.address.toLowerCase() === address.toLowerCase()
    );
  }

  /**
   * Get wallet count
   */
  getWalletCount(): number {
    return this.wallets.length;
  }

  /**
   * Get all wallets (for admin purposes only)
   */
  getAllWallets(): ethers.Wallet[] {
    return [...this.wallets]; // Return a copy to prevent external modification
  }
}
