import axios from 'axios';
import logger from '../utils/logger.js';

export interface NFTToken {
  contractAddress: string;
  tokenID: string;
  tokenName: string;
  tokenSymbol: string;
}

export interface TransactionDetails {
  hash: string;
  blockNumber: string;
  timeStamp: string;
  from: string;
  to: string;
  value: string;
  gas: string;
  gasPrice: string;
  gasUsed: string;
  isError: string;
}

export class EtherscanService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api-sepolia.etherscan.io/api';

  constructor() {
    this.apiKey = process.env.ETHERSCAN_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('ETHERSCAN_API_KEY is required');
    }
  }

  /**
   * Get ERC-721 NFT tokens owned by an address
   */
  async getNFTTokens(address: string): Promise<NFTToken[]> {
    try {
      logger.info('Fetching NFT tokens for address', {
        component: 'etherscan',
        address
      });

      const response = await axios.get(this.baseUrl, {
        params: {
          module: 'account',
          action: 'tokennfttx',
          address: address,
          startblock: 0,
          endblock: 'latest',
          sort: 'desc',
          apikey: this.apiKey
        }
      });

      if (response.data.status !== '1') {
        logger.warn('Etherscan API returned non-success status', {
          component: 'etherscan',
          status: response.data.status,
          message: response.data.message
        });
        return [];
      }

      const transactions = response.data.result || [];
      const ownedTokens: NFTToken[] = [];
      const tokenMap = new Map<string, NFTToken>();

      // Process transactions to determine current ownership
      for (const tx of transactions) {
        const tokenKey = `${tx.contractAddress}-${tx.tokenID}`;
        
        if (tx.to.toLowerCase() === address.toLowerCase()) {
          // Token received
          tokenMap.set(tokenKey, {
            contractAddress: tx.contractAddress,
            tokenID: tx.tokenID,
            tokenName: tx.tokenName,
            tokenSymbol: tx.tokenSymbol
          });
        } else if (tx.from.toLowerCase() === address.toLowerCase()) {
          // Token sent away
          tokenMap.delete(tokenKey);
        }
      }

      ownedTokens.push(...tokenMap.values());

      logger.info('NFT tokens retrieved', {
        component: 'etherscan',
        address,
        tokenCount: ownedTokens.length
      });

      return ownedTokens;
    } catch (error) {
      logger.error('Failed to fetch NFT tokens', {
        component: 'etherscan',
        address,
        error
      });
      return [];
    }
  }

  /**
   * Get SoulBound NFT tokens specifically for the SoulboundNFT contract
   */
  async getSoulboundNFTs(address: string, soulboundContractAddress: string): Promise<NFTToken[]> {
    try {
      const allNFTs = await this.getNFTTokens(address);
      
      // Filter for SoulBound NFTs from the specific contract
      const soulboundNFTs = allNFTs.filter(nft => 
        nft.contractAddress.toLowerCase() === soulboundContractAddress.toLowerCase()
      );

      logger.info('SoulBound NFTs identified', {
        component: 'etherscan',
        address,
        soulboundContract: soulboundContractAddress,
        soulboundCount: soulboundNFTs.length,
        totalNFTs: allNFTs.length
      });

      return soulboundNFTs;
    } catch (error) {
      logger.error('Failed to get SoulBound NFTs', {
        component: 'etherscan',
        address,
        error
      });
      return [];
    }
  }

  /**
   * Get transaction details by hash
   */
  async getTransactionDetails(txHash: string): Promise<TransactionDetails | null> {
    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          module: 'proxy',
          action: 'eth_getTransactionByHash',
          txhash: txHash,
          apikey: this.apiKey
        }
      });

      if (response.data.result) {
        return response.data.result;
      }

      return null;
    } catch (error) {
      logger.error('Failed to get transaction details', {
        component: 'etherscan',
        txHash,
        error
      });
      return null;
    }
  }

  /**
   * Verify NFT ownership at current block
   */
  async verifyNFTOwnership(contractAddress: string, tokenId: string, ownerAddress: string): Promise<boolean> {
    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          module: 'proxy',
          action: 'eth_call',
          to: contractAddress,
          data: `0x6352211e${tokenId.padStart(64, '0')}`, // ownerOf(uint256)
          tag: 'latest',
          apikey: this.apiKey
        }
      });

      if (response.data.result) {
        const owner = '0x' + response.data.result.slice(-40);
        return owner.toLowerCase() === ownerAddress.toLowerCase();
      }

      return false;
    } catch (error) {
      logger.error('Failed to verify NFT ownership', {
        component: 'etherscan',
        contractAddress,
        tokenId,
        ownerAddress,
        error
      });
      return false;
    }
  }
}