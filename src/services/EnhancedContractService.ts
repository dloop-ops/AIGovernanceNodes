import { ethers } from 'ethers';
import { contractLogger as logger } from '../utils/logger.js';
import { RpcManager } from './RpcManager.js';
import { WalletService } from './WalletService.js';
import fs from 'fs';
import path from 'path';

export interface NodeInfo {
  nodeAddress: string;
  metadata: string;
  isActive: boolean;
  stakedAmount: bigint;
  reputation: bigint;
  activeUntil: bigint;
}

export class EnhancedContractService {
  private rpcManager: RpcManager;
  private walletService: WalletService;
  private contractAddresses: any;
  private contractABIs: Map<string, any[]> = new Map();

  constructor(rpcManager: RpcManager, walletService: WalletService) {
    this.rpcManager = rpcManager;
    this.walletService = walletService;
    this.contractAddresses = {
      aiNodeRegistry: '0x0045c7D99489f1d8A5900243956B0206344417DD',
      dloopToken: '0x05B366778566e93abfB8e4A9B794e4ad006446b4',
      soulboundNft: '0x6391C14631b2Be5374297fA3110687b80233104c'
    };
    this.loadEnhancedABIs();
  }

  private loadEnhancedABIs(): void {
    try {
      // Load enhanced AI Node Registry ABI
      const registryABIPath = path.join(process.cwd(), 'abis', 'ainoderegistry.abi.v2.json');
      if (fs.existsSync(registryABIPath)) {
        const registryData = JSON.parse(fs.readFileSync(registryABIPath, 'utf8'));
        this.contractABIs.set('aiNodeRegistry', registryData.abi);
        logger.info('Enhanced AI Node Registry ABI loaded');
      } else {
        // Fallback to minimal ABI
        this.contractABIs.set('aiNodeRegistry', [
          'function registerNode(string metadata) external',
          'function getNodeInfo(address) external view returns (tuple(address, string, bool, uint256, uint256, uint256))',
          'function isNodeActive(address) external view returns (bool)',
          'function nodeStakeAmount() external view returns (uint256)',
          'error NodeNotRegistered()',
          'error NodeAlreadyRegistered()'
        ]);
      }

      // Load enhanced SoulBound NFT ABI
      const nftABIPath = path.join(process.cwd(), 'abis', 'soulboundnft.abi.v2.json');
      if (fs.existsSync(nftABIPath)) {
        const nftData = JSON.parse(fs.readFileSync(nftABIPath, 'utf8'));
        this.contractABIs.set('soulboundNft', nftData.abi);
        logger.info('Enhanced SoulBound NFT ABI loaded');
      } else {
        // Fallback to minimal ABI
        this.contractABIs.set('soulboundNft', [
          'function balanceOf(address) external view returns (uint256)',
          'function mint(address, string) external returns (uint256)',
          'function ownerOf(uint256) external view returns (address)'
        ]);
      }

      // DLOOP Token ABI
      this.contractABIs.set('dloopToken', [
        'function balanceOf(address) external view returns (uint256)',
        'function approve(address, uint256) external returns (bool)',
        'function allowance(address, address) external view returns (uint256)',
        'function transfer(address, uint256) external returns (bool)'
      ]);

      logger.info('Enhanced contract ABIs loaded successfully');
    } catch (error) {
      logger.error('Failed to load enhanced ABIs', { error });
      throw error;
    }
  }

  async registerNode(nodeIndex: number, metadata: string): Promise<string> {
    try {
      const wallet = this.walletService.getWallet(nodeIndex);
      const registryABI = this.contractABIs.get('aiNodeRegistry');

      if (!registryABI) {
        throw new Error('AI Node Registry ABI not found');
      }

      logger.info('Attempting node registration with enhanced service', {
        nodeIndex,
        nodeAddress: wallet.address,
        metadataLength: metadata.length
      });

      const result = await this.rpcManager.executeWithRetry(
        async (provider) => {
          const contract = new ethers.Contract(
            this.contractAddresses.aiNodeRegistry,
            registryABI,
            wallet.connect(provider)
          );

          // Check if already registered
          try {
            await contract.getNodeInfo(wallet.address);
            logger.info('Node already registered', { nodeAddress: wallet.address });
            return 'already_registered';
          } catch (error: any) {
            if (!error.message.includes('NodeNotRegistered')) {
              throw error;
            }
          }

          // Proceed with registration
          const gasEstimate = await contract.registerNode.estimateGas(metadata);
          const gasLimit = (gasEstimate * 120n) / 100n; // Add 20% buffer

          const tx = await contract.registerNode(metadata, {
            gasLimit: gasLimit.toString(),
            maxFeePerGas: ethers.parseUnits('15', 'gwei'),
            maxPriorityFeePerGas: ethers.parseUnits('1.5', 'gwei')
          });

          logger.info('Registration transaction submitted', {
            txHash: tx.hash,
            gasLimit: gasLimit.toString()
          });

          const receipt = await tx.wait(1);

          if (receipt && receipt.status === 1) {
            logger.info('Node registration successful', {
              nodeAddress: wallet.address,
              txHash: tx.hash,
              gasUsed: receipt.gasUsed.toString()
            });
            return tx.hash;
          } else {
            throw new Error('Transaction failed');
          }
        },
        3,
        'Register Node'
      );

      return result;
    } catch (error: any) {
      logger.error('Node registration failed', {
        nodeIndex,
        error: error.message
      });

      if (error.message.includes('NodeAlreadyRegistered')) {
        logger.info('Node was already registered', { nodeIndex });
        return 'already_registered';
      }

      throw error;
    }
  }

  async getNodeInfo(nodeAddress: string): Promise<NodeInfo | null> {
    try {
      const registryABI = this.contractABIs.get('aiNodeRegistry');

      if (!registryABI) {
        throw new Error('AI Node Registry ABI not found');
      }

      const result = await this.rpcManager.executeWithRetry(
        async (provider) => {
          const contract = new ethers.Contract(
            this.contractAddresses.aiNodeRegistry,
            registryABI,
            provider
          );

          const nodeInfo = await contract.getNodeInfo(nodeAddress);

          return {
            nodeAddress: nodeInfo[0],
            metadata: nodeInfo[1],
            isActive: nodeInfo[2],
            stakedAmount: nodeInfo[3],
            reputation: nodeInfo[4],
            activeUntil: nodeInfo[5]
          };
        },
        3,
        'Get Node Info'
      );

      return result;
    } catch (error: any) {
      if (error.message.includes('NodeNotRegistered')) {
        return null;
      }
      throw error;
    }
  }

  async isNodeActive(nodeAddress: string): Promise<boolean> {
    try {
      const registryABI = this.contractABIs.get('aiNodeRegistry');

      if (!registryABI) {
        throw new Error('AI Node Registry ABI not found');
      }

      const result = await this.rpcManager.executeWithRetry(
        async (provider) => {
          const contract = new ethers.Contract(
            this.contractAddresses.aiNodeRegistry,
            registryABI,
            provider
          );

          return await contract.isNodeActive(nodeAddress);
        },
        3,
        'Check Node Active Status'
      );

      return result;
    } catch (error: any) {
      if (error.message.includes('NodeNotRegistered')) {
        return false;
      }
      throw error;
    }
  }

  async getSoulboundNFTBalance(nodeAddress: string): Promise<number> {
    try {
      const nftABI = this.contractABIs.get('soulboundNft');

      if (!nftABI) {
        throw new Error('SoulBound NFT ABI not found');
      }

      const result = await this.rpcManager.executeWithRetry(
        async (provider) => {
          const contract = new ethers.Contract(
            this.contractAddresses.soulboundNft,
            nftABI,
            provider
          );

          const balance = await contract.balanceOf(nodeAddress);
          return parseInt(balance.toString());
        },
        3,
        'Get SoulBound NFT Balance'
      );

      return result;
    } catch (error) {
      logger.error('Failed to get SoulBound NFT balance', { nodeAddress, error });
      return 0;
    }
  }

  async getDloopTokenBalance(nodeAddress: string): Promise<string> {
    try {
      const tokenABI = this.contractABIs.get('dloopToken');

      if (!tokenABI) {
        throw new Error('DLOOP Token ABI not found');
      }

      const result = await this.rpcManager.executeWithRetry(
        async (provider) => {
          const contract = new ethers.Contract(
            this.contractAddresses.dloopToken,
            tokenABI,
            provider
          );

          const balance = await contract.balanceOf(nodeAddress);
          return ethers.formatEther(balance);
        },
        3,
        'Get DLOOP Token Balance'
      );

      return result;
    } catch (error) {
      logger.error('Failed to get DLOOP token balance', { nodeAddress, error });
      return '0';
    }
  }

  async approveTokens(nodeIndex: number, spender: string, amount: string): Promise<string> {
    try {
      const wallet = this.walletService.getWallet(nodeIndex);
      const tokenABI = this.contractABIs.get('dloopToken');

      if (!tokenABI) {
        throw new Error('DLOOP Token ABI not found');
      }

      const result = await this.rpcManager.executeWithRetry(
        async (provider) => {
          const contract = new ethers.Contract(
            this.contractAddresses.dloopToken,
            tokenABI,
            wallet.connect(provider)
          );

          const amountWei = ethers.parseEther(amount);
          const tx = await contract.approve(spender, amountWei, {
            gasLimit: '100000',
            maxFeePerGas: ethers.parseUnits('15', 'gwei'),
            maxPriorityFeePerGas: ethers.parseUnits('1.5', 'gwei')
          });

          const receipt = await tx.wait(1);

          if (receipt && receipt.status === 1) {
            logger.info('Token approval successful', {
              nodeIndex,
              spender,
              amount,
              txHash: tx.hash
            });
            return tx.hash;
          } else {
            throw new Error('Approval transaction failed');
          }
        },
        3,
        'Approve Tokens'
      );

      return result;
    } catch (error) {
      logger.error('Token approval failed', { nodeIndex, spender, amount, error });
      throw error;
    }
  }

  getContractAddresses() {
    return this.contractAddresses;
  }
}
