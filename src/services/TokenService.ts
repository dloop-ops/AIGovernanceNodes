import { ethers } from 'ethers';
import { WalletService } from './WalletService.js';
import { ContractService } from './ContractService.js';
import { contractLogger as logger } from '../utils/logger.js';

/**
 * Service for managing DLOOP token operations
 */
export class TokenService {
  private walletService: WalletService;
  private contractService: ContractService;
  private readonly minTokenBalance = ethers.parseEther('100'); // Minimum 100 DLOOP tokens for voting

  constructor(walletService: WalletService, contractService: ContractService) {
    this.walletService = walletService;
    this.contractService = contractService;
  }

  /**
   * Check if node has sufficient tokens for governance participation
   */
  async hasMinimumTokens(nodeIndex: number): Promise<boolean> {
    try {
      const balanceStr = await this.contractService.getTokenBalance(nodeIndex);
      const balance = ethers.parseEther(balanceStr);
      return balance >= this.minTokenBalance;
    } catch (error) {
      logger.error(`Failed to check token balance for node ${nodeIndex}`, { error });
      return false;
    }
  }

  /**
   * Request DLOOP tokens from faucet if available
   */
  async requestTokensFromFaucet(nodeIndex: number): Promise<boolean> {
    try {
      const wallet = this.walletService.getWallet(nodeIndex);
      logger.info(`Requesting DLOOP tokens from faucet for node ${nodeIndex}`, {
        address: wallet.address
      });

      // This would typically call a faucet contract or API
      // For now, we'll log the request and return false to indicate manual action needed
      logger.warn(`No faucet available - manual token acquisition required for node ${nodeIndex}`, {
        address: wallet.address,
        requiredAmount: ethers.formatEther(this.minTokenBalance)
      });

      return false;
    } catch (error) {
      logger.error(`Failed to request tokens from faucet for node ${nodeIndex}`, { error });
      return false;
    }
  }

  /**
   * Check and ensure all nodes have minimum tokens
   */
  async ensureMinimumTokensForAllNodes(): Promise<void> {
    const nodeCount = this.walletService.getWalletCount();

    for (let i = 0; i < nodeCount; i++) {
      try {
        const hasTokens = await this.hasMinimumTokens(i);
        if (!hasTokens) {
          logger.warn(`Node ${i} has insufficient DLOOP tokens for governance`, {
            nodeIndex: i,
            requiredAmount: ethers.formatEther(this.minTokenBalance)
          });

          // Attempt to get tokens from faucet
          await this.requestTokensFromFaucet(i);
        }
      } catch (error) {
        logger.error(`Failed to check tokens for node ${i}`, { error });
      }
    }
  }

  /**
   * Get token status for all nodes
   */
  async getTokenStatusForAllNodes(): Promise<
    Array<{
      nodeIndex: number;
      address: string;
      balance: string;
      hasMinimum: boolean;
      votingPower: string;
    }>
  > {
    const nodeCount = this.walletService.getWalletCount();
    const results: {
      nodeIndex: number;
      address: string;
      balance: string;
      hasMinimum: boolean;
      votingPower: string;
    }[] = [];

    for (let i = 0; i < nodeCount; i++) {
      try {
        const wallet = this.walletService.getWallet(i);
        const balance = await this.contractService.getTokenBalance(i);
        const votingPower = await this.contractService.getVotingPower(i);
        const hasMinimum = await this.hasMinimumTokens(i);

        results.push({
          nodeIndex: i,
          address: wallet.address,
          balance,
          hasMinimum,
          votingPower
        });
      } catch (error) {
        logger.error(`Failed to get token status for node ${i}`, { error });
        results.push({
          nodeIndex: i,
          address: this.walletService.getWallet(i).address,
          balance: 'Error',
          hasMinimum: false,
          votingPower: 'Error'
        });
      }
    }

    return results;
  }
}
