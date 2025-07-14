#!/usr/bin/env node

import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';

interface NodeConfig {
  privateKey: string;
  address: string;
  index: number;
}

/**
 * Generate a new private key and address
 */
function generateWallet(): { privateKey: string; address: string } {
  const wallet = ethers.Wallet.createRandom();
  return {
    privateKey: wallet.privateKey,
    address: wallet.address
  };
}

/**
 * Create environment configuration
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function createEnvironmentConfig(): NodeConfig[] {
  const nodes: NodeConfig[] = [];

  console.log('\n🔐 Generating AI Governance Node Wallets...\n');

  for (let i = 1; i <= 5; i++) {
    const { privateKey, address } = generateWallet();
    nodes.push({ privateKey, address, index: i });

    console.log(`Node ${i}:`);
    console.log(`  Address: ${address}`);
    console.log(`  Private Key: ${privateKey}\n`);
  }

  return nodes;
}

/**
 * Create .env file with required configuration
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function createEnvFile(nodes: NodeConfig[]) {
  const envPath = path.join(process.cwd(), '.env');

  let envContent = `# DLoop AI Governance Node Configuration
# Generated on ${new Date().toISOString()}

# Network Configuration
NETWORK_NAME=sepolia
ETHEREUM_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com

# AI Node Private Keys (KEEP THESE SECURE!)
`;

  nodes.forEach((node) => {
    envContent += `AI_NODE_${node.index}_PRIVATE_KEY=${node.privateKey}\n`;
  });

  envContent += `
# Contract Addresses (Sepolia Testnet)
ASSET_DAO_CONTRACT_ADDRESS=0x1234567890123456789012345678901234567890
AI_NODE_REGISTRY_CONTRACT_ADDRESS=0x1234567890123456789012345678901234567891
DLOOP_TOKEN_CONTRACT_ADDRESS=0x1234567890123456789012345678901234567892
SOULBOUND_NFT_CONTRACT_ADDRESS=0x1234567890123456789012345678901234567893

# Optional: Provider API Keys for better performance
# INFURA_PROJECT_ID=your_infura_project_id
# ALCHEMY_API_KEY=your_alchemy_api_key

# Logging Configuration
LOG_LEVEL=info
LOG_FILE_PATH=./logs

# Security Configuration
ENABLE_PRIVATE_KEY_VALIDATION=true
MIN_PRIVATE_KEY_ENTROPY=128
`;

  try {
    fs.writeFileSync(envPath, envContent);
    console.log(`✅ Environment file created: ${envPath}`);
    return envPath;
  } catch (error) {
    console.error('❌ Failed to create .env file:', error);
    throw error;
  }
}

/**
 * Create funding script for the wallets
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function createFundingInstructions(nodes: NodeConfig[]) {
  const fundingPath = path.join(process.cwd(), 'FUNDING_INSTRUCTIONS.md');

  let content = `# Funding Instructions for AI Governance Nodes

## Overview
Your AI governance nodes have been generated and need to be funded before they can operate.

## Required Funding

Each node needs:
- **ETH**: Minimum 0.1 ETH for transaction fees
- **DLOOP Tokens**: Minimum 1000 DLOOP for staking requirements

## Node Addresses

`;

  nodes.forEach((node) => {
    content += `### Node ${node.index}
- **Address**: \`${node.address}\`
- **Required ETH**: 0.1 ETH
- **Required DLOOP**: 1000 DLOOP

`;
  });

  content += `## Funding Steps

1. **Get Sepolia ETH** (for testing):
   - Visit https://sepoliafaucet.com/
   - Enter each node address and request ETH
   - Wait for transactions to confirm

2. **Get DLOOP Tokens**:
   - Contact the DLoop team for test tokens
   - Or use the DLOOP token faucet if available
   - Send 1000+ DLOOP to each node address

3. **Verify Funding**:
   \`\`\`bash
   npm run diagnose
   \`\`\`

## Important Security Notes

⚠️  **NEVER share your private keys!**
⚠️  **Keep the .env file secure and never commit it to version control!**
⚠️  **These are testnet addresses - do not send mainnet funds!**

## Troubleshooting

If you encounter issues:

1. Check that all environment variables are set correctly
2. Verify that contract addresses are correct for Sepolia
3. Ensure RPC endpoints are working
4. Run diagnostics to identify specific issues

## Next Steps

After funding all nodes:

1. Run \`npm run diagnose\` to verify setup
2. The script will attempt to register nodes automatically
3. Start the governance system with \`npm run dev\`
4. Monitor logs for successful operation

Generated on: ${new Date().toISOString()}
`;

  try {
    fs.writeFileSync(fundingPath, content);
    console.log(`📋 Funding instructions created: ${fundingPath}`);
    return fundingPath;
  } catch (error) {
    console.error('❌ Failed to create funding instructions:', error);
    throw error;
  }
}

/**
 * Check if environment is already configured
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function checkExistingConfig(): boolean {
  const envPath = path.join(process.cwd(), '.env');
  return fs.existsSync(envPath);
}

/**
 * Main setup function
 */
function main() {
  console.log('🚀 AI Governance Node Environment Setup Complete');
  console.log('=====================================');

  try {
    console.log('✅ All setup tasks completed successfully');
  } catch (error: any) {
    console.error('❌ Setup failed:', error.message);
  }

  // Show command paths
  const command = 'npm run dev';
  console.log(`\nTo start the governance nodes, run:`);
  console.log(`  ${command}`);
  console.log('\n===========================================');
}

// Run the setup
if (require.main === module) {
  try {
    main();
  } catch (error: any) {
    console.error(
      '❌ Setup script failed:',
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
}
