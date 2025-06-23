import { ContractService } from './ContractService.js';
import { WalletService } from './WalletService.js';
import { GovernanceError } from '../types/index.js';
import logger from '../utils/logger.js';

/**
 * Service for managing SoulBound NFT authentication for AI governance nodes
 */
export class SoulboundNFTService {
  private walletService: WalletService;
  private contractService: ContractService;

  constructor(walletService: WalletService, contractService: ContractService) {
    this.walletService = walletService;
    this.contractService = contractService;
  }

  /**
   * Authenticate node by checking for valid SoulBound NFT
   */
  async authenticateNode(nodeIndex: number): Promise<boolean> {
    try {
      const wallet = this.walletService.getWallet(nodeIndex);
      
      logger.info('Authenticating node with SoulBound NFT', {
        component: 'soulbound-nft',
        nodeIndex,
        nodeAddress: wallet.address
      });

      // Check if node has valid SoulBound NFT
      const hasValidNFT = await this.contractService.hasValidSoulboundNFT(nodeIndex);
      
      if (!hasValidNFT) {
        logger.warn('Node lacks valid SoulBound NFT for authentication', {
          component: 'soulbound-nft',
          nodeIndex,
          nodeAddress: wallet.address
        });
        return false;
      }

      logger.info('Node authentication successful', {
        component: 'soulbound-nft',
        nodeIndex,
        nodeAddress: wallet.address
      });

      return true;
    } catch (error) {
      logger.error('Node authentication failed', {
        component: 'soulbound-nft',
        nodeIndex,
        error
      });
      return false;
    }
  }

  /**
   * Get authentication status for all nodes
   */
  async getAuthenticationStatus(): Promise<Array<{
    nodeIndex: number;
    address: string;
    isAuthenticated: boolean;
    tokenCount: number;
    tokens: string[];
  }>> {
    const statuses = [];
    
    for (let i = 0; i < this.walletService.getWalletCount(); i++) {
      try {
        const wallet = this.walletService.getWallet(i);
        const isAuthenticated = await this.contractService.hasValidSoulboundNFT(i);
        const tokens = await this.contractService.getNodeSoulboundTokens(i);
        
        statuses.push({
          nodeIndex: i,
          address: wallet.address,
          isAuthenticated,
          tokenCount: tokens.length,
          tokens
        });
      } catch (error) {
        logger.error(`Failed to get authentication status for node ${i}`, { error });
        statuses.push({
          nodeIndex: i,
          address: this.walletService.getWallet(i).address,
          isAuthenticated: false,
          tokenCount: 0,
          tokens: []
        });
      }
    }
    
    return statuses;
  }

  /**
   * Attempt to mint SoulBound NFT for node authentication
   */
  async mintAuthenticationNFT(nodeIndex: number, nodeId: string, strategy: string): Promise<boolean> {
    try {
      const wallet = this.walletService.getWallet(nodeIndex);
      
      // Create metadata for the SoulBound NFT
      const metadata = JSON.stringify({
        nodeId,
        nodeType: 'governance',
        strategy,
        walletAddress: wallet.address,
        mintedAt: Date.now(),
        version: '1.0.0',
        description: `AI Governance Node ${nodeId} using ${strategy} strategy`,
        attributes: [
          {
            trait_type: 'Node Type',
            value: 'AI Governance'
          },
          {
            trait_type: 'Strategy',
            value: strategy
          },
          {
            trait_type: 'Network',
            value: 'Sepolia'
          }
        ]
      });

      logger.info('Attempting to mint SoulBound NFT for node authentication', {
        component: 'soulbound-nft',
        nodeIndex,
        nodeId,
        strategy,
        nodeAddress: wallet.address
      });

      // Attempt to mint SoulBound NFT
      const txHash = await this.contractService.mintSoulboundNFT(nodeIndex, metadata);
      
      logger.info('SoulBound NFT minted successfully for node', {
        component: 'soulbound-nft',
        nodeIndex,
        nodeId,
        txHash
      });

      return true;
    } catch (error) {
      logger.error('Failed to mint SoulBound NFT for node', {
        component: 'soulbound-nft',
        nodeIndex,
        nodeId,
        error
      });
      return false;
    }
  }

  /**
   * Validate authentication before governance operations
   */
  async validateForGovernance(nodeIndex: number): Promise<void> {
    const isAuthenticated = await this.authenticateNode(nodeIndex);
    
    if (!isAuthenticated) {
      throw new GovernanceError(
        `Node ${nodeIndex} lacks valid SoulBound NFT authentication for governance participation`,
        'AUTHENTICATION_REQUIRED'
      );
    }
  }

  /**
   * Check if any nodes need authentication
   */
  async identifyUnauthenticatedNodes(): Promise<number[]> {
    const unauthenticatedNodes = [];
    
    for (let i = 0; i < this.walletService.getWalletCount(); i++) {
      const isAuthenticated = await this.authenticateNode(i);
      if (!isAuthenticated) {
        unauthenticatedNodes.push(i);
      }
    }
    
    return unauthenticatedNodes;
  }

  /**
   * Attempt to authenticate all nodes
   */
  async authenticateAllNodes(): Promise<{
    totalNodes: number;
    authenticatedNodes: number;
    unauthenticatedNodes: number[];
  }> {
    const totalNodes = this.walletService.getWalletCount();
    const unauthenticatedNodes = await this.identifyUnauthenticatedNodes();
    const authenticatedNodes = totalNodes - unauthenticatedNodes.length;

    logger.info('Node authentication summary', {
      component: 'soulbound-nft',
      totalNodes,
      authenticatedNodes,
      unauthenticatedCount: unauthenticatedNodes.length,
      unauthenticatedNodes
    });

    return {
      totalNodes,
      authenticatedNodes,
      unauthenticatedNodes
    };
  }
}