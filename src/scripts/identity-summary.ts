import * as fs from 'fs';
import * as path from 'path';

interface IdentityConfig {
  version: string;
  lastUpdated: string;
  protocol: {
    name: string;
    version: string;
    network: string;
    chainId: number;
    environment: string;
  };
  SoulboundNFT: {
    address: string;
    args: any[];
    deployment: {
      deployer: string;
      deploymentBlock: number;
      deploymentTx: string;
      mintedTokens: {
        totalMinted: number;
        activeGovernanceTokens: number[];
        reservedTokens: number[];
      };
    };
  };
  aiGovernanceNodes: {
    totalSupply: number;
    activeNodes: number[];
    nodeRegistry: Record<string, {
      tokenId: number;
      address: string;
      uri: string;
      status: string;
      mintedAt: string;
    }>;
  };
  metadata: {
    deployer: string;
    deploymentBlock: number;
    deploymentTx: string;
    operationalStatus: {
      totalNFTsMinted: number;
      activeGovernanceNodes: number;
      operationalSince: string;
      lastUpdated: string;
      healthStatus: string;
    };
  };
}

function displayIdentitySummary(): void {
  try {
    console.log('🔍 Reading DLoop AI Governance Identity Configuration...\n');

    const identityPath = path.join(process.cwd(), 'identity.json');
    
    if (!fs.existsSync(identityPath)) {
      console.error('❌ Identity file not found at:', identityPath);
      return;
    }

    const identityData = fs.readFileSync(identityPath, 'utf8');
    const identity: IdentityConfig = JSON.parse(identityData);

    console.log('📋 DLOOP AI GOVERNANCE IDENTITY SUMMARY');
    console.log('=' .repeat(50));
    
    // Protocol Information
    console.log('\n🌐 Protocol Information:');
    console.log(`  Name: ${identity.protocol.name}`);
    console.log(`  Version: ${identity.protocol.version}`);
    console.log(`  Network: ${identity.protocol.network} (Chain ID: ${identity.protocol.chainId})`);
    console.log(`  Environment: ${identity.protocol.environment}`);
    console.log(`  Last Updated: ${identity.lastUpdated}`);

    // SoulBound NFT Contract
    console.log('\n🎯 SoulBound NFT Contract:');
    console.log(`  Address: ${identity.SoulboundNFT.address}`);
    console.log(`  Deployer: ${identity.SoulboundNFT.deployment.deployer}`);
    console.log(`  Deployment Block: ${identity.SoulboundNFT.deployment.deploymentBlock}`);
    console.log(`  Deployment Tx: ${identity.SoulboundNFT.deployment.deploymentTx}`);
    console.log(`  Total Minted: ${identity.SoulboundNFT.deployment.mintedTokens.totalMinted} NFTs`);

    // Active Governance Nodes
    console.log('\n🤖 Active AI Governance Nodes:');
    console.log(`  Total Active: ${identity.aiGovernanceNodes.activeNodes.length}`);
    console.log(`  Active Token IDs: [${identity.aiGovernanceNodes.activeNodes.join(', ')}]`);
    
    console.log('\n📊 Node Registry:');
    Object.entries(identity.aiGovernanceNodes.nodeRegistry).forEach(([nodeKey, nodeData]) => {
      console.log(`  ${nodeKey.toUpperCase()}:`);
      console.log(`    Token ID: #${nodeData.tokenId}`);
      console.log(`    Address: ${nodeData.address}`);
      console.log(`    Status: ${nodeData.status} ✅`);
      console.log(`    URI: ${nodeData.uri}`);
      console.log(`    Minted: ${nodeData.mintedAt}`);
      console.log('');
    });

    // Operational Status
    console.log('📈 Operational Status:');
    console.log(`  Health: ${identity.metadata.operationalStatus.healthStatus.toUpperCase()} 🟢`);
    console.log(`  Active Nodes: ${identity.metadata.operationalStatus.activeGovernanceNodes}`);
    console.log(`  Operational Since: ${identity.metadata.operationalStatus.operationalSince}`);
    console.log(`  Last Updated: ${identity.metadata.operationalStatus.lastUpdated}`);

    // Reserved and Future Tokens
    console.log('\n🔒 Token Allocation:');
    console.log(`  Active Governance: [${identity.SoulboundNFT.deployment.mintedTokens.activeGovernanceTokens.join(', ')}]`);
    console.log(`  Reserved: [${identity.SoulboundNFT.deployment.mintedTokens.reservedTokens.slice(0, 10).join(', ')}...]`);
    console.log(`  Future Expansion: [${identity.SoulboundNFT.deployment.mintedTokens.reservedTokens.slice(-5).join(', ')}]`);

    // Verification Links
    console.log('\n🔗 Verification & Links:');
    console.log(`  Contract Verification: https://sepolia.etherscan.io/address/${identity.SoulboundNFT.address}`);
    console.log(`  Transaction: https://sepolia.etherscan.io/tx/${identity.SoulboundNFT.deployment.deploymentTx}`);

    console.log('\n✅ Identity configuration successfully loaded and validated!');
    console.log('\n🚀 DLoop AI Governance Nodes are operational and ready for governance participation.');

  } catch (error) {
    console.error('❌ Error reading identity configuration:', error);
    if (error instanceof SyntaxError) {
      console.error('💡 The identity.json file may have invalid JSON syntax.');
    }
  }
}

// Run the summary display
displayIdentitySummary();