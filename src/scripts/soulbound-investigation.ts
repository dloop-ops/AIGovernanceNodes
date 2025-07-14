#!/usr/bin/env node

import dotenv from 'dotenv';
import { ethers } from 'ethers';
import axios from 'axios';
import { contractLogger as logger } from '../utils/logger.js';

// Load environment variables
dotenv.config();

// Configuration
const SEPOLIA_CHAIN_ID = 11155111;
const ETHERSCAN_API_KEY = 'HG7DAYXKN5B6AZE35WRDVQRSNN5IDC3ZG6';
const SOULBOUND_NFT_CONTRACT = '0x6391C14631b2Be5374297fA3110687b80233104c';
const DEPLOYER_ADDRESS = '0x3639D1F746A977775522221f53D0B1eA5749b8b9';

// AI Governance Node Addresses
const NODE_ADDRESSES = [
  '0x0E354b735a6eee60726e6e3A431e3320Ba26ba45', // Node 1
  '0xb1c25B40A79b7D046E539A9fbBB58789efFD0874', // Node 2
  '0x65b1d03F5F2Ad4Ff036ea7AeEf5Ec07Db27a5C58', // Node 3
  '0x766766f2815f835E4A0b1360833C7A15DDF2b72a', // Node 4
  '0xA6fBf2dD68dB92dA309D6b82DAe2180d903a36FA' // Node 5
];

// SoulBound NFT ABI (from the actual deployed contract)
const SOULBOUND_ABI = [
  // Basic ERC721 functions
  'function balanceOf(address owner) view returns (uint256)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function tokenURI(uint256 tokenId) view returns (string)',

  // SoulBound specific functions
  'function hasValidToken(address owner) view returns (bool)',
  'function getTokensByOwner(address owner) view returns (uint256[])',
  'function mint(address to, string memory uri) returns (uint256)',
  'function batchMint(address[] memory recipients, string[] memory uris)',
  'function revoke(uint256 tokenId)',

  // Access control
  'function hasRole(bytes32 role, address account) view returns (bool)',
  'function ADMIN_ROLE() view returns (bytes32)',
  'function MINTER_ROLE() view returns (bytes32)',
  'function DEFAULT_ADMIN_ROLE() view returns (bytes32)',

  // Token tracking - Note: totalSupply might not exist, using alternative approach
  'function nextTokenId() view returns (uint256)',

  // Events
  'event TokenMinted(uint256 indexed tokenId, address indexed to, string tokenURI)',
  'event TokenRevoked(uint256 indexed tokenId, address indexed owner)',
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'
];

interface NFTInvestigationResult {
  address: string;
  nodeIndex: number;
  hasNFT: boolean;
  nftCount: number;
  tokenIds: number[];
  tokenURIs: string[];
}

interface ContractInfo {
  totalSupply: number;
  deployerIsAdmin: boolean;
  deployerIsMinter: boolean;
  canMint: boolean;
}

class SoulboundInvestigator {
  private provider: ethers.Provider;
  private contract: ethers.Contract;
  private deployerWallet?: ethers.Wallet;

  constructor() {
    // Initialize provider with multiple endpoints for reliability
    const rpcUrls = [
      'https://ethereum-sepolia-rpc.publicnode.com',
      'https://sepolia.gateway.tenderly.co',
      'https://sepolia.infura.io/v3/ca485bd6567e4c5fb5693ee66a5885d8'
    ];

    this.provider = new ethers.JsonRpcProvider(rpcUrls[0]);
    this.contract = new ethers.Contract(SOULBOUND_NFT_CONTRACT, SOULBOUND_ABI, this.provider);
  }

  /**
   * Initialize with deployer private key if available
   */
  async initializeWithDeployer(deployerPrivateKey?: string): Promise<void> {
    if (deployerPrivateKey) {
      this.deployerWallet = new ethers.Wallet(deployerPrivateKey, this.provider);
      logger.info('Deployer wallet initialized', {
        address: this.deployerWallet.address,
        expectedAddress: DEPLOYER_ADDRESS
      });

      if (this.deployerWallet.address.toLowerCase() !== DEPLOYER_ADDRESS.toLowerCase()) {
        throw new Error(
          `Deployer address mismatch! Expected: ${DEPLOYER_ADDRESS}, Got: ${this.deployerWallet.address}`
        );
      }
    }
  }

  /**
   * Get contract information and permissions
   */
  async getContractInfo(): Promise<ContractInfo> {
    try {
      logger.info('Fetching contract information...');

      // Use a safer approach - try different methods to get token count
      let totalSupply = 0;
      try {
        // Try nextTokenId first (more likely to exist)
        const nextId = await this.contract.nextTokenId();
        totalSupply = Math.max(0, Number(nextId) - 1); // Assuming tokens start from 1
      } catch (error) {
        logger.warn('nextTokenId not available, estimating from known tokens');
        // Fallback: check if tokens 1-20 exist (reasonable estimate)
        for (let i = 1; i <= 20; i++) {
          try {
            await this.contract.ownerOf(i);
            totalSupply = i;
          } catch {
            break; // Token doesn't exist, so we found the limit
          }
        }
      }

      const [adminRole, minterRole, defaultAdminRole] = await Promise.all([
        this.contract.ADMIN_ROLE(),
        this.contract.MINTER_ROLE(),
        this.contract.DEFAULT_ADMIN_ROLE()
      ]);

      const [deployerIsAdmin, deployerIsMinter, deployerIsDefaultAdmin] = await Promise.all([
        this.contract.hasRole(adminRole, DEPLOYER_ADDRESS),
        this.contract.hasRole(minterRole, DEPLOYER_ADDRESS),
        this.contract.hasRole(defaultAdminRole, DEPLOYER_ADDRESS)
      ]);

      const canMint = deployerIsMinter || deployerIsAdmin || deployerIsDefaultAdmin;

      logger.info('Contract information retrieved', {
        totalSupply,
        deployerIsAdmin,
        deployerIsMinter,
        deployerIsDefaultAdmin,
        canMint
      });

      return {
        totalSupply,
        deployerIsAdmin: deployerIsAdmin || deployerIsDefaultAdmin,
        deployerIsMinter,
        canMint
      };
    } catch (error) {
      logger.error('Failed to get contract info:', error);
      throw error;
    }
  }

  /**
   * Check NFT assignments for all AI governance nodes
   */
  async investigateNodeNFTs(): Promise<NFTInvestigationResult[]> {
    const results: NFTInvestigationResult[] = [];

    logger.info('Starting SoulBound NFT investigation for AI governance nodes...');

    for (let i = 0; i < NODE_ADDRESSES.length; i++) {
      const address = NODE_ADDRESSES[i];

      try {
        logger.info(`Investigating Node ${i + 1}: ${address}`);

        // Check if node has any NFTs
        const [balance, hasValidToken] = await Promise.all([
          this.contract.balanceOf(address),
          this.contract.hasValidToken(address).catch(() => false) // Fallback if method doesn't exist
        ]);

        const nftCount = Number(balance);
        let tokenIds: number[] = [];
        const tokenURIs: string[] = [];

        // If the node has NFTs, get token details
        if (nftCount > 0) {
          try {
            // Try to get tokens by owner (if method exists)
            const tokens = await this.contract.getTokensByOwner(address).catch(() => []);
            tokenIds = tokens.map((id: any) => Number(id));

            // Get token URIs
            for (const tokenId of tokenIds) {
              try {
                const uri = await this.contract.tokenURI(tokenId);
                tokenURIs.push(uri);
              } catch (error) {
                logger.warn(`Failed to get URI for token ${tokenId}:`, error);
                tokenURIs.push('');
              }
            }
          } catch (error) {
            logger.warn(`Failed to get detailed token info for ${address}:`, error);
          }
        }

        const result: NFTInvestigationResult = {
          address,
          nodeIndex: i,
          hasNFT: nftCount > 0,
          nftCount,
          tokenIds,
          tokenURIs
        };

        results.push(result);

        logger.info(`Node ${i + 1} investigation complete`, {
          address,
          hasNFT: result.hasNFT,
          nftCount: result.nftCount,
          tokenIds: result.tokenIds
        });
      } catch (error) {
        logger.error(`Failed to investigate Node ${i + 1} (${address}):`, error);
        results.push({
          address,
          nodeIndex: i,
          hasNFT: false,
          nftCount: 0,
          tokenIds: [],
          tokenURIs: []
        });
      }
    }

    return results;
  }

  /**
   * Get identity metadata from d-loop.io
   */
  async getIdentityMetadata(): Promise<any> {
    try {
      logger.info('Fetching identity metadata from d-loop.io...');
      const response = await axios.get('https://d-loop.io/identity/identity.json');
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch identity metadata:', error);
      return null;
    }
  }

  /**
   * Mint SoulBound NFTs for nodes that don't have them
   */
  async mintMissingNFTs(
    missingNodes: NFTInvestigationResult[],
    contractInfo: ContractInfo
  ): Promise<void> {
    if (!this.deployerWallet) {
      throw new Error('Deployer wallet not initialized. Cannot mint NFTs.');
    }

    if (!contractInfo.canMint) {
      throw new Error('Deployer does not have minting permissions.');
    }

    logger.info(`Minting SoulBound NFTs for ${missingNodes.length} nodes...`);

    const contractWithSigner = this.contract.connect(this.deployerWallet);

    // Prepare batch mint data
    const recipients: string[] = [];
    const uris: string[] = [];

    for (const node of missingNodes) {
      recipients.push(node.address);
      // Create unique URI for each node
      const uri = `https://d-loop.io/identity/ai-governance-node-${node.nodeIndex + 1}.json`;
      uris.push(uri);
    }

    try {
      // Estimate gas for batch mint
      const gasEstimate = await (contractWithSigner as any).batchMint.estimateGas(recipients, uris);
      const gasLimit = (gasEstimate * 120n) / 100n; // 20% buffer

      logger.info('Executing batch mint...', {
        recipients: recipients.length,
        gasEstimate: gasEstimate.toString(),
        gasLimit: gasLimit.toString()
      });

      // Execute batch mint
      const tx = await (contractWithSigner as any).batchMint(recipients, uris, {
        gasLimit
      });

      logger.info('Batch mint transaction sent', {
        txHash: tx.hash,
        recipients: recipients.length
      });

      // Wait for confirmation
      const receipt = await tx.wait();

      if (receipt?.status === 1) {
        logger.info('SoulBound NFTs minted successfully!', {
          txHash: tx.hash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString()
        });
      } else {
        throw new Error('Transaction failed');
      }
    } catch (error) {
      logger.error('Failed to mint SoulBound NFTs:', error);

      // Try individual mints as fallback
      logger.info('Attempting individual mints as fallback...');

      for (let i = 0; i < recipients.length; i++) {
        try {
          const tx = await (contractWithSigner as any).mint(recipients[i], uris[i]);
          await tx.wait();
          logger.info(`Successfully minted NFT for ${recipients[i]}`);
        } catch (error) {
          logger.error(`Failed to mint NFT for ${recipients[i]}:`, error);
        }
      }
    }
  }

  /**
   * Verify NFT assignments after minting
   */
  async verifyMinting(nodeAddresses: string[]): Promise<void> {
    logger.info('Verifying NFT assignments after minting...');

    for (const address of nodeAddresses) {
      try {
        const balance = await this.contract.balanceOf(address);
        const hasNFT = Number(balance) > 0;

        logger.info(`Verification for ${address}:`, {
          hasNFT,
          balance: balance.toString()
        });
      } catch (error) {
        logger.error(`Failed to verify ${address}:`, error);
      }
    }
  }

  /**
   * Check Etherscan for additional contract information and get ABI
   */
  async checkEtherscan(): Promise<any> {
    try {
      logger.info('Checking Etherscan for additional contract information...');

      const abiUrl = `https://api-sepolia.etherscan.io/api?module=contract&action=getabi&address=${SOULBOUND_NFT_CONTRACT}&apikey=${ETHERSCAN_API_KEY}`;
      const codeUrl = `https://api-sepolia.etherscan.io/api?module=proxy&action=eth_getCode&address=${SOULBOUND_NFT_CONTRACT}&tag=latest&apikey=${ETHERSCAN_API_KEY}`;

      const [abiResponse, codeResponse] = await Promise.all([
        axios.get(abiUrl),
        axios.get(codeUrl)
      ]);

      const hasCode = codeResponse.data.result && codeResponse.data.result !== '0x';
      logger.info(`Contract exists on Sepolia: ${hasCode}`);

      if (abiResponse.data.status === '1') {
        logger.info('Contract verified on Etherscan');
        try {
          const abi = JSON.parse(abiResponse.data.result);
          logger.info(`Contract has ${abi.length} ABI functions/events`);
          return abi;
        } catch (error) {
          logger.warn('Failed to parse ABI from Etherscan');
        }
      } else {
        logger.warn('Contract not verified on Etherscan or API error:', abiResponse.data.result);
      }

      return null;
    } catch (error) {
      logger.warn('Failed to check Etherscan:', error);
      return null;
    }
  }
}

/**
 * Main investigation function
 */
async function main() {
  const command = process.argv[2] || 'investigate';
  const deployerPrivateKey = process.argv[3]; // Optional deployer private key

  console.log('🔍 SoulBound NFT Investigation for AI Governance Nodes\n');

  try {
    const investigator = new SoulboundInvestigator();

    // Initialize with deployer if private key provided
    if (deployerPrivateKey) {
      await investigator.initializeWithDeployer(deployerPrivateKey);
    }

    switch (command) {
      case 'investigate':
        await runInvestigation(investigator);
        break;
      case 'mint':
        if (!deployerPrivateKey) {
          throw new Error(
            'Deployer private key required for minting. Usage: npm run soulbound:mint <deployer_private_key>'
          );
        }
        await runMinting(investigator);
        break;
      case 'verify':
        await runVerification(investigator);
        break;
      default:
        console.log(`
SoulBound NFT Investigation Tool

Usage: npm run soulbound:<command> [deployer_private_key]

Commands:
  investigate  Check NFT assignments for all AI governance nodes (default)
  mint         Mint missing NFTs (requires deployer private key)
  verify       Verify current NFT assignments

Examples:
  npm run soulbound:investigate
  npm run soulbound:mint 0x...deployerPrivateKey
  npm run soulbound:verify
        `);
        break;
    }
  } catch (error) {
    logger.error('Investigation script failed:', error);
    console.error(
      '❌ Investigation failed:',
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
}

async function runInvestigation(investigator: SoulboundInvestigator): Promise<void> {
  // Get contract info
  const contractInfo = await investigator.getContractInfo();

  // Get identity metadata
  const identityData = await investigator.getIdentityMetadata();

  // Check Etherscan
  await investigator.checkEtherscan();

  // Investigate node NFTs
  const results = await investigator.investigateNodeNFTs();

  // Display results
  console.log('\n=== SOULBOUND NFT INVESTIGATION RESULTS ===\n');

  console.log('Contract Information:');
  console.log(`  📊 Total Supply: ${contractInfo.totalSupply} NFTs`);
  console.log(`  👑 Deployer is Admin: ${contractInfo.deployerIsAdmin ? 'YES' : 'NO'}`);
  console.log(`  🖨️  Deployer can Mint: ${contractInfo.canMint ? 'YES' : 'NO'}`);
  console.log(`  📄 Contract: ${SOULBOUND_NFT_CONTRACT}`);
  console.log(`  🚀 Deployer: ${DEPLOYER_ADDRESS}\n`);

  if (identityData) {
    console.log('Identity Metadata:');
    console.log(`  📋 Name: ${identityData.name || 'Unknown'}`);
    console.log(`  🌐 Network: ${identityData.network || 'Unknown'}`);
    console.log(`  📅 Last Updated: ${identityData.lastUpdated || 'Unknown'}\n`);
  }

  console.log('Node NFT Assignments:');
  const nodesWithNFTs = results.filter((r) => r.hasNFT);
  const nodesWithoutNFTs = results.filter((r) => !r.hasNFT);

  results.forEach((result, index) => {
    console.log(`  Node ${index + 1} (${result.address}):`);
    console.log(`    ✅ Has NFT: ${result.hasNFT ? 'YES' : 'NO'}`);
    console.log(`    📊 NFT Count: ${result.nftCount}`);
    if (result.tokenIds.length > 0) {
      console.log(`    🎫 Token IDs: ${result.tokenIds.join(', ')}`);
      result.tokenURIs.forEach((uri, i) => {
        if (uri) console.log(`    🔗 Token ${result.tokenIds[i]} URI: ${uri}`);
      });
    }
    console.log('');
  });

  console.log(
    `📈 Summary: ${nodesWithNFTs.length}/${results.length} nodes have SoulBound NFTs assigned`
  );

  if (nodesWithoutNFTs.length > 0) {
    console.log(`\n⚠️  ${nodesWithoutNFTs.length} nodes need SoulBound NFTs:`);
    nodesWithoutNFTs.forEach((node) => {
      console.log(`  - Node ${node.nodeIndex + 1}: ${node.address}`);
    });
    console.log('\nTo mint missing NFTs, run:');
    console.log('npm run soulbound:mint <deployer_private_key>\n');
  } else {
    console.log('\n🎉 All AI governance nodes have SoulBound NFTs assigned!\n');
  }
}

async function runMinting(investigator: SoulboundInvestigator): Promise<void> {
  console.log('🖨️  Minting SoulBound NFTs for AI Governance Nodes...\n');

  const contractInfo = await investigator.getContractInfo();
  const results = await investigator.investigateNodeNFTs();
  const missingNodes = results.filter((r) => !r.hasNFT);

  if (missingNodes.length === 0) {
    console.log('✅ All nodes already have SoulBound NFTs. No minting needed.\n');
    return;
  }

  console.log(
    `🎯 Found ${missingNodes.length} nodes without SoulBound NFTs. Proceeding with minting...\n`
  );

  await investigator.mintMissingNFTs(missingNodes, contractInfo);

  // Verify minting
  const missingAddresses = missingNodes.map((n) => n.address);
  await investigator.verifyMinting(missingAddresses);

  console.log('🎉 Minting process completed! Run investigation again to verify results.\n');
}

async function runVerification(investigator: SoulboundInvestigator): Promise<void> {
  console.log('✅ Verifying SoulBound NFT assignments...\n');

  const results = await investigator.investigateNodeNFTs();

  console.log('Verification Results:');
  results.forEach((result, index) => {
    const status = result.hasNFT ? '✅ ASSIGNED' : '❌ MISSING';
    console.log(`  Node ${index + 1}: ${status} (${result.nftCount} NFTs)`);
  });

  const assignedCount = results.filter((r) => r.hasNFT).length;
  console.log(
    `\n📊 Overall Status: ${assignedCount}/${results.length} nodes have SoulBound NFTs\n`
  );
}

// Run the main function
if (require.main === module) {
  main().catch((error) => {
    logger.error('Main execution failed:', error);
    console.error('❌ Execution failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}

export { SoulboundInvestigator };
export type { NFTInvestigationResult, ContractInfo };
