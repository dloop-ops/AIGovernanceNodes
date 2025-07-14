import { ethers } from 'ethers';
import { getCurrentNetwork } from '../config/networks.js';
import { getCurrentContractAddresses } from '../config/contracts.js';
import logger from '../utils/logger.js';

/**
 * Admin service for minting SoulBound NFTs using admin privileges
 */
export class AdminSoulboundService {
  private adminWallet: ethers.Wallet;
  private soulboundContract!: ethers.Contract;
  private provider: ethers.Provider;

  constructor() {
    const network = getCurrentNetwork();
    this.provider = new ethers.JsonRpcProvider(network.rpcUrl);

    const adminPrivateKey = process.env.SOULBOUND_ADMIN_PRIVATE_KEY;
    if (!adminPrivateKey) {
      throw new Error('SOULBOUND_ADMIN_PRIVATE_KEY environment variable is required');
    }

    this.adminWallet = new ethers.Wallet(adminPrivateKey, this.provider);
    this.initializeContract();

    logger.info('Admin SoulBound service initialized', {
      component: 'admin-soulbound',
      adminAddress: this.adminWallet.address
    });
  }

  private initializeContract(): void {
    const addresses = getCurrentContractAddresses();

    // SoulBound NFT ABI for minting and verification
    const soulboundAbi = [
      'function mint(address to, string memory tokenURI) external returns (uint256)',
      'function hasRole(bytes32 role, address account) external view returns (bool)',
      'function MINTER_ROLE() external view returns (bytes32)',
      'function balanceOf(address owner) external view returns (uint256)',
      'function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256)',
      'function ownerOf(uint256 tokenId) external view returns (address)',
      'function getTokensByOwner(address owner) external view returns (uint256[])',
      'function totalSupply() external view returns (uint256)',
      'event TokenMinted(uint256 indexed tokenId, address indexed to, string tokenURI)'
    ];

    this.soulboundContract = new ethers.Contract(
      addresses.soulboundNft,
      soulboundAbi,
      this.adminWallet
    );
  }

  /**
   * Check if admin wallet has minter role
   */
  async checkMinterRole(): Promise<boolean> {
    try {
      const minterRole = await this.soulboundContract.MINTER_ROLE();
      const hasMinterRole = await this.soulboundContract.hasRole(
        minterRole,
        this.adminWallet.address
      );

      logger.info('Minter role check', {
        component: 'admin-soulbound',
        adminAddress: this.adminWallet.address,
        hasMinterRole
      });

      return hasMinterRole;
    } catch (error) {
      logger.error('Failed to check minter role', {
        component: 'admin-soulbound',
        error
      });
      return false;
    }
  }

  /**
   * Mint SoulBound NFT for a governance node
   */
  async mintForGovernanceNode(
    nodeAddress: string,
    nodeId: string
  ): Promise<{
    success: boolean;
    txHash?: string;
    tokenId?: string;
    error?: string;
  }> {
    try {
      logger.info('Minting SoulBound NFT for governance node', {
        component: 'admin-soulbound',
        nodeAddress,
        nodeId
      });

      // Check if node already has SoulBound NFT
      const balance = await this.soulboundContract.balanceOf(nodeAddress);
      if (balance > 0) {
        logger.info('Node already has SoulBound NFT', {
          component: 'admin-soulbound',
          nodeAddress,
          balance: balance.toString()
        });

        return {
          success: true,
          tokenId: 'existing'
        };
      }

      // Create metadata for the governance node
      const metadata = {
        name: `AI Governance Node ${nodeId}`,
        description: `SoulBound NFT for DLoop AI Governance Node ${nodeId}`,
        image: `https://governance.dloop.io/nft/${nodeId}.png`,
        attributes: [
          {
            trait_type: 'Node Type',
            value: 'AI Governance'
          },
          {
            trait_type: 'Node ID',
            value: nodeId
          },
          {
            trait_type: 'Network',
            value: 'Sepolia'
          },
          {
            trait_type: 'Timestamp',
            value: Date.now().toString()
          }
        ]
      };

      const tokenURI = `data:application/json;base64,${Buffer.from(
        JSON.stringify(metadata)
      ).toString('base64')}`;

      // Mint the SoulBound NFT
      const tx = await this.soulboundContract.mint(nodeAddress, tokenURI);

      logger.info('SoulBound NFT mint transaction submitted', {
        component: 'admin-soulbound',
        nodeAddress,
        txHash: tx.hash
      });

      // Wait for transaction confirmation
      const receipt = await tx.wait();

      if (receipt.status === 1) {
        // Extract token ID from logs
        const mintEvent = receipt.logs.find(
          (log: any) => log.topics[0] === ethers.id('Transfer(address,address,uint256)')
        );

        const tokenId = mintEvent ? ethers.toBigInt(mintEvent.topics[3]).toString() : 'unknown';

        logger.info('SoulBound NFT minted successfully', {
          component: 'admin-soulbound',
          nodeAddress,
          txHash: tx.hash,
          tokenId,
          gasUsed: receipt.gasUsed.toString()
        });

        return {
          success: true,
          txHash: tx.hash,
          tokenId
        };
      } else {
        throw new Error('Transaction failed');
      }
    } catch (error) {
      logger.error('Failed to mint SoulBound NFT', {
        component: 'admin-soulbound',
        nodeAddress,
        nodeId,
        error
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Batch mint SoulBound NFTs for all governance nodes
   */
  async batchMintForGovernanceNodes(
    nodes: Array<{
      address: string;
      nodeId: string;
    }>
  ): Promise<
    Array<{
      nodeId: string;
      address: string;
      success: boolean;
      txHash?: string;
      tokenId?: string;
      error?: string;
    }>
  > {
    const results: Array<{
      nodeId: string;
      address: string;
      success: boolean;
      txHash?: string;
      tokenId?: string;
      error?: string;
    }> = [];

    logger.info('Starting batch mint for governance nodes', {
      component: 'admin-soulbound',
      nodeCount: nodes.length
    });

    for (const node of nodes) {
      const result = await this.mintForGovernanceNode(node.address, node.nodeId);

      results.push({
        nodeId: node.nodeId,
        address: node.address,
        ...result
      });

      // Add delay between mints to avoid rate limiting
      if (results.length < nodes.length) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    logger.info('Batch mint completed', {
      component: 'admin-soulbound',
      totalNodes: nodes.length,
      successful,
      failed
    });

    return results;
  }

  /**
   * Verify SoulBound NFT ownership using direct balance check
   */
  async verifyOwnership(nodeAddress: string): Promise<{
    hasNFT: boolean;
    tokenCount: number;
    tokenIds: string[];
  }> {
    try {
      logger.info('Verifying SoulBound NFT ownership', {
        component: 'admin-soulbound',
        nodeAddress
      });

      const balance = await this.soulboundContract.balanceOf(nodeAddress);
      const tokenCount = Number(balance);
      const tokenIds: string[] = [];

      logger.info('Balance check result', {
        component: 'admin-soulbound',
        nodeAddress,
        balance: balance.toString(),
        tokenCount
      });

      // Try multiple methods to get token IDs
      if (tokenCount > 0) {
        // Method 1: Try getTokensByOwner if available
        try {
          const tokens = await this.soulboundContract.getTokensByOwner(nodeAddress);
          for (const token of tokens) {
            tokenIds.push(token.toString());
          }
        } catch (error) {
          logger.info('getTokensByOwner not available, trying tokenOfOwnerByIndex', {
            component: 'admin-soulbound',
            nodeAddress
          });

          // Method 2: Try tokenOfOwnerByIndex
          for (let i = 0; i < tokenCount; i++) {
            try {
              const tokenId = await this.soulboundContract.tokenOfOwnerByIndex(nodeAddress, i);
              tokenIds.push(tokenId.toString());
            } catch (indexError) {
              logger.warn('Failed to get token by index', {
                component: 'admin-soulbound',
                nodeAddress,
                index: i,
                error: indexError
              });
            }
          }
        }
      }

      const result = {
        hasNFT: tokenCount > 0,
        tokenCount,
        tokenIds
      };

      logger.info('Ownership verification complete', {
        component: 'admin-soulbound',
        nodeAddress,
        result
      });

      return result;
    } catch (error) {
      logger.error('Failed to verify ownership', {
        component: 'admin-soulbound',
        nodeAddress,
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        hasNFT: false,
        tokenCount: 0,
        tokenIds: []
      };
    }
  }

  /**
   * Get admin wallet address
   */
  getAdminAddress(): string {
    return this.adminWallet.address;
  }

  async batchDistribute(nodes: Array<{ nodeId: string; address: string }>): Promise<any> {
    const results: Array<{
      nodeId: string;
      address: string;
      success: boolean;
      txHash?: string;
      tokenId?: string;
      error?: string;
    }> = [];

    logger.info(`Starting batch distribution for ${nodes.length} nodes...`);

    for (const node of nodes) {
      try {
        const result = await this.mintForGovernanceNode(node.address, node.nodeId);
        results.push({
          nodeId: node.nodeId,
          address: node.address,
          ...result
        });
      } catch (error: any) {
        logger.error(`Failed to distribute to ${node.nodeId}:`, error);
        results.push({
          nodeId: node.nodeId,
          address: node.address,
          success: false,
          error: error.message
        });
      }
    }

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return {
      distributed: successful,
      failed: failed,
      results: results
    };
  }
  /**
   * Distribute SoulBound NFTs to all registered nodes
   */
  async distributeAllSoulboundNFTs(): Promise<{
    distributed: number;
    failed: number;
    results: Array<{
      nodeId: string;
      address: string;
      success: boolean;
      txHash?: string;
      tokenId?: string;
      error?: string;
    }>;
  }> {
    logger.info('🎯 Distributing SoulBound NFTs to all registered nodes...');

    const results: Array<{
      nodeId: string;
      address: string;
      success: boolean;
      txHash?: string;
      tokenId?: string;
      error?: string;
    }> = [];

    const nodes = await this.getRegisteredNodes();

    for (const node of nodes) {
      try {
        const result = await this.mintForGovernanceNode(node.address, node.nodeId);
        results.push({
          nodeId: node.nodeId,
          address: node.address,
          ...result
        });
      } catch (error: any) {
        logger.error(`Failed to distribute SoulBound NFT to node ${node.nodeId}:`, error);
        results.push({
          nodeId: node.nodeId,
          address: node.address,
          success: false,
          error: error.message
        });
      }
    }

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    logger.info(
      `✅ SoulBound NFT distribution complete: ${successful} successful, ${failed} failed`
    );

    return {
      distributed: successful,
      failed: failed,
      results: results
    };
  }

  /**
   * Get registered nodes from the registry
   */
  private async getRegisteredNodes(): Promise<Array<{ nodeId: string; address: string }>> {
    // Implementation would depend on your node registry
    // For now, return empty array or implement based on your registry
    return [];
  }
}
