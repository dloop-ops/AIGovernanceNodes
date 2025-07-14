#!/usr/bin/env node

import dotenv from 'dotenv';
import { ethers } from 'ethers';
import { contractLogger as logger } from '../utils/logger.js';

// Load environment variables
dotenv.config();

// Configuration
const SOULBOUND_NFT_CONTRACT = '0x6391C14631b2Be5374297fA3110687b80233104c';
const DEPLOYER_ADDRESS = '0x3639D1F746A977775522221f53D0B1eA5749b8b9';

// Basic ABI for token analysis
const SOULBOUND_ABI = [
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function balanceOf(address owner) view returns (uint256)'
];

class TokenAnalyzer {
  private provider: ethers.Provider;
  private contract: ethers.Contract;

  constructor() {
    const rpcUrls = [
      'https://ethereum-sepolia-rpc.publicnode.com',
      'https://sepolia.gateway.tenderly.co',
      'https://sepolia.infura.io/v3/ca485bd6567e4c5fb5693ee66a5885d8'
    ];

    this.provider = new ethers.JsonRpcProvider(rpcUrls[0]);
    this.contract = new ethers.Contract(SOULBOUND_NFT_CONTRACT, SOULBOUND_ABI, this.provider);
  }

  async analyzeTokenDistribution(): Promise<void> {
    console.log('🔍 Analyzing SoulBound NFT Token Distribution\n');

    const tokenHolders = new Map<string, number[]>();
    const tokenDetails: Array<{ id: number; owner: string; uri: string }> = [];

    logger.info('Analyzing tokens 1-20...');

    for (let tokenId = 1; tokenId <= 20; tokenId++) {
      try {
        const [owner, uri] = await Promise.all([
          this.contract.ownerOf(tokenId),
          this.contract.tokenURI(tokenId).catch(() => 'N/A')
        ]);

        // Track token holders
        if (!tokenHolders.has(owner)) {
          tokenHolders.set(owner, []);
        }
        tokenHolders.get(owner)!.push(tokenId);

        tokenDetails.push({ id: tokenId, owner, uri });

        logger.info(`Token ${tokenId}: ${owner}`, { tokenId, owner, uri });
      } catch (error) {
        logger.warn(`Token ${tokenId} does not exist or error occurred:`, error);
        break;
      }
    }

    // Display results
    console.log('\n=== TOKEN DISTRIBUTION ANALYSIS ===\n');

    console.log('📊 Token Holders Summary:');
    for (const [owner, tokens] of tokenHolders.entries()) {
      const isDeployer = owner.toLowerCase() === DEPLOYER_ADDRESS.toLowerCase();
      console.log(`  ${owner} ${isDeployer ? '(DEPLOYER)' : ''}`);
      console.log(`    📦 Tokens: ${tokens.join(', ')} (${tokens.length} total)`);
      console.log('');
    }

    console.log('🎫 Individual Token Details:');
    for (const token of tokenDetails) {
      console.log(`  Token #${token.id}:`);
      console.log(`    👤 Owner: ${token.owner}`);
      console.log(`    🔗 URI: ${token.uri}`);
      console.log('');
    }

    console.log('📈 Distribution Stats:');
    console.log(`  🎯 Total Tokens Found: ${tokenDetails.length}`);
    console.log(`  👥 Unique Holders: ${tokenHolders.size}`);
    console.log(`  🚀 Deployer Tokens: ${tokenHolders.get(DEPLOYER_ADDRESS)?.length || 0}`);

    // Check if deployer has enough tokens to distribute
    const deployerTokens = tokenHolders.get(DEPLOYER_ADDRESS)?.length || 0;
    const tokensNeeded = 5; // For 5 AI governance nodes

    if (deployerTokens >= tokensNeeded) {
      console.log(
        `  ✅ Deployer has ${deployerTokens} tokens - sufficient for ${tokensNeeded} AI nodes`
      );
      console.log(
        `\n💡 Recommendation: Transfer existing tokens to AI governance nodes instead of minting new ones`
      );

      const deployerTokenList = tokenHolders.get(DEPLOYER_ADDRESS) || [];
      console.log(`\n🔄 Suggested Token Transfers:`);
      const nodeAddresses = [
        '0x0E354b735a6eee60726e6e3A431e3320Ba26ba45',
        '0xb1c25B40A79b7D046E539A9fbBB58789efFD0874',
        '0x65b1d03F5F2Ad4Ff036ea7AeEf5Ec07Db27a5C58',
        '0x766766f2815f835E4A0b1360833C7A15DDF2b72a',
        '0xA6fBf2dD68dB92dA309D6b82DAe2180d903a36FA'
      ];

      for (let i = 0; i < Math.min(tokensNeeded, deployerTokenList.length); i++) {
        console.log(
          `  - Transfer Token #${deployerTokenList[i]} → Node ${i + 1} (${nodeAddresses[i]})`
        );
      }
    } else {
      console.log(
        `  ⚠️  Deployer has ${deployerTokens} tokens - need to mint ${
          tokensNeeded - deployerTokens
        } more`
      );
    }

    console.log('\n');
  }
}

async function main() {
  try {
    const analyzer = new TokenAnalyzer();
    await analyzer.analyzeTokenDistribution();
  } catch (error) {
    logger.error('Token analysis failed:', error);
    console.error('❌ Analysis failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
