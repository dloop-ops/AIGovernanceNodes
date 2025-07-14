import { EtherscanService, NFTToken } from './EtherscanService.js';
import { ContractService } from './ContractService.js';
import { WalletService } from './WalletService.js';
import { GovernanceError } from '../types/index.js';
import logger from '../utils/logger.js';

export interface TransferResult {
  success: boolean;
  txHash?: string;
  error?: string;
  tokenId: string;
  fromAddress: string;
  toAddress: string;
}

export class NFTTransferService {
  private etherscanService: EtherscanService;
  private contractService: ContractService;
  private walletService: WalletService;
  private sourceAddress = '0x3639D1F746A977775522221f53D0B1eA5749b8b9';
  private soulboundContractAddress = '0x6391C14631b2Be5374297fA3110687b80233104c';

  constructor(contractService: ContractService, walletService: WalletService) {
    this.etherscanService = new EtherscanService();
    this.contractService = contractService;
    this.walletService = walletService;
  }

  /**
   * Analyze the source address for available SoulBound NFTs
   */
  async analyzeSoulboundNFTs(): Promise<NFTToken[]> {
    try {
      logger.info('Analyzing source address for SoulBound NFTs', {
        component: 'nft-transfer',
        sourceAddress: this.sourceAddress,
        soulboundContract: this.soulboundContractAddress
      });

      const soulboundNFTs = await this.etherscanService.getSoulboundNFTs(
        this.sourceAddress,
        this.soulboundContractAddress
      );

      logger.info('SoulBound NFT analysis complete', {
        component: 'nft-transfer',
        availableNFTs: soulboundNFTs.length,
        nfts: soulboundNFTs.map(nft => ({
          tokenId: nft.tokenID,
          contract: nft.contractAddress
        }))
      });

      return soulboundNFTs;
    } catch (error) {
      logger.error('Failed to analyze SoulBound NFTs', {
        component: 'nft-transfer',
        sourceAddress: this.sourceAddress,
        error
      });
      return [];
    }
  }

  /**
   * Transfer SoulBound NFTs to governance nodes
   * Note: SoulBound NFTs are typically non-transferable, so this will attempt minting instead
   */
  async distributeSoulboundNFTs(): Promise<TransferResult[]> {
    const results: TransferResult[] = [];

    try {
      // Get governance node addresses
      const governanceNodes = [
        { nodeId: 'ai-gov-01', address: '0x561529036AB886c1FD3D112360383D79fBA9E71c', nodeIndex: 0 },
        { nodeId: 'ai-gov-02', address: '0x48B2353954496679CF7C73d239bc12098cB0C5B4', nodeIndex: 1 },
        { nodeId: 'ai-gov-03', address: '0x43f76157E9696302E287181828cB3B0C6B89d31e', nodeIndex: 2 },
        { nodeId: 'ai-gov-04', address: '0xC02764913ce2F23B094F0338a711EFD984024A46', nodeIndex: 3 },
        { nodeId: 'ai-gov-05', address: '0x00FfF703fa6837A1a46b3DF9B6a047404046379E', nodeIndex: 4 }
      ];

      logger.info('Starting SoulBound NFT distribution to governance nodes', {
        component: 'nft-transfer',
        nodeCount: governanceNodes.length
      });

      // Check current authentication status
      const authStatuses = await this.getCurrentAuthenticationStatus();

      for (const node of governanceNodes) {
        try {
          const nodeAuth = authStatuses.find(auth => auth.nodeIndex === node.nodeIndex);

          if (nodeAuth?.isAuthenticated) {
            logger.info(`Node ${node.nodeId} already has valid SoulBound NFT`, {
              component: 'nft-transfer',
              nodeId: node.nodeId,
              address: node.address
            });

            results.push({
              success: true,
              tokenId: 'existing',
              fromAddress: 'already-owned',
              toAddress: node.address
            });
            continue;
          }

          // Attempt to mint SoulBound NFT for the node
          const mintResult = await this.mintSoulboundNFTForNode(node.nodeId, node.nodeIndex);

          results.push({
            success: mintResult.success,
            txHash: mintResult.txHash,
            error: mintResult.error,
            tokenId: mintResult.tokenId || 'unknown',
            fromAddress: 'minted',
            toAddress: node.address
          });

        } catch (error) {
          logger.error(`Failed to process SoulBound NFT for node ${node.nodeId}`, {
            component: 'nft-transfer',
            nodeId: node.nodeId,
            error
          });

          results.push({
            success: false,
            error: error instanceof Error ? error.message : String(error),
            tokenId: 'failed',
            fromAddress: 'error',
            toAddress: node.address
          });
        }
      }

      // Log final distribution results
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      logger.info('SoulBound NFT distribution completed', {
        component: 'nft-transfer',
        totalNodes: governanceNodes.length,
        successful,
        failed,
        results: results.map(r => ({
          success: r.success,
          tokenId: r.tokenId,
          toAddress: r.toAddress,
          txHash: r.txHash
        }))
      });

      return results;
    } catch (error) {
      logger.error('SoulBound NFT distribution failed', {
        component: 'nft-transfer',
        error
      });
      throw new GovernanceError(
        `Failed to distribute SoulBound NFTs: ${error instanceof Error ? error.message : String(error)}`,
        'NFT_DISTRIBUTION_ERROR'
      );
    }
  }

  /**
   * Mint SoulBound NFT for a specific governance node
   */
  private async mintSoulboundNFTForNode(nodeId: string, nodeIndex: number): Promise<{
    success: boolean;
    txHash?: string;
    error?: string;
    tokenId?: string;
  }> {
    try {
      const wallet = this.walletService.getWallet(nodeIndex);

      // Create metadata for the governance node
      const metadata = JSON.stringify({
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
            trait_type: 'Version',
            value: '1.0.0'
          }
        ]
      });

      logger.info(`Attempting to mint SoulBound NFT for ${nodeId}`, {
        component: 'nft-transfer',
        nodeId,
        nodeIndex,
        address: wallet.address
      });

      const txHash = await this.contractService.mintSoulboundNFT(nodeIndex, metadata);

      return {
        success: true,
        txHash,
        tokenId: 'pending-confirmation'
      };
    } catch (error) {
      logger.error(`Failed to mint SoulBound NFT for ${nodeId}`, {
        component: 'nft-transfer',
        nodeId,
        nodeIndex,
        error
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Get current authentication status for all nodes
   */
  private async getCurrentAuthenticationStatus(): Promise<Array<{
    nodeIndex: number;
    address: string;
    isAuthenticated: boolean;
    tokenCount: number;
  }>> {
    const statuses: Array<{
            nodeIndex: number;
            address: string;
            isAuthenticated: boolean;
            tokenCount: number;
        }> = [];

        for (let i = 0; i < this.walletService.getWalletCount(); i++) {
            try {
                const wallet = this.walletService.getWallet(i);
                const address = wallet.address;
                const tokens = await this.contractService.getNodeSoulboundTokens(0); // Using node index
                const isAuthenticated = tokens.length > 0;

                statuses.push({
                    nodeIndex: i,
                    address,
                    isAuthenticated,
                    tokenCount: tokens.length
                });
            } catch (error: any) {
                logger.error(`Failed to check status for node ${i}:`, error);
                statuses.push({
                    nodeIndex: i,
                    address: this.walletService.getWallet(i).address,
                    isAuthenticated: false,
                    tokenCount: 0
                });
            }
        }

    return statuses;
  }

  /**
   * Verify SoulBound NFT ownership after distribution
   */
  async verifyDistribution(): Promise<{
    totalNodes: number;
    authenticatedNodes: number;
    verificationResults: Array<{
      nodeIndex: number;
      nodeAddress: string;
      hasValidNFT: boolean;
      tokenCount: number;
    }>;
  }> {
    try {
      logger.info('Verifying SoulBound NFT distribution', {
        component: 'nft-transfer'
      });

      const authStatuses = await this.getCurrentAuthenticationStatus();
      const authenticatedNodes = authStatuses.filter(status => status.isAuthenticated).length;

      const verificationResults = authStatuses.map(status => ({
        nodeIndex: status.nodeIndex,
        nodeAddress: status.address,
        hasValidNFT: status.isAuthenticated,
        tokenCount: status.tokenCount
      }));

      logger.info('Distribution verification complete', {
        component: 'nft-transfer',
        totalNodes: authStatuses.length,
        authenticatedNodes,
        verificationResults
      });

      return {
        totalNodes: authStatuses.length,
        authenticatedNodes,
        verificationResults
      };
    } catch (error) {
      logger.error('Failed to verify distribution', {
        component: 'nft-transfer',
        error
      });
      throw new GovernanceError(
        `Failed to verify SoulBound NFT distribution: ${error instanceof Error ? error.message : String(error)}`,
        'NFT_VERIFICATION_ERROR'
      );
    }
  }
}