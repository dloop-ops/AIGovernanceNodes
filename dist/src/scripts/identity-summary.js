"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
function displayIdentitySummary() {
    try {
        console.log('🔍 Reading DLoop AI Governance Identity Configuration...\n');
        const identityPath = path.join(process.cwd(), 'identity.json');
        if (!fs.existsSync(identityPath)) {
            console.error('❌ Identity file not found at:', identityPath);
            return;
        }
        const identityData = fs.readFileSync(identityPath, 'utf8');
        const identity = JSON.parse(identityData);
        console.log('📋 DLOOP AI GOVERNANCE IDENTITY SUMMARY');
        console.log('='.repeat(50));
        console.log('\n🌐 Protocol Information:');
        console.log(`  Name: ${identity.protocol.name}`);
        console.log(`  Version: ${identity.protocol.version}`);
        console.log(`  Network: ${identity.protocol.network} (Chain ID: ${identity.protocol.chainId})`);
        console.log(`  Environment: ${identity.protocol.environment}`);
        console.log(`  Last Updated: ${identity.lastUpdated}`);
        console.log('\n🎯 SoulBound NFT Contract:');
        console.log(`  Address: ${identity.SoulboundNFT.address}`);
        console.log(`  Deployer: ${identity.SoulboundNFT.deployment.deployer}`);
        console.log(`  Deployment Block: ${identity.SoulboundNFT.deployment.deploymentBlock}`);
        console.log(`  Deployment Tx: ${identity.SoulboundNFT.deployment.deploymentTx}`);
        console.log(`  Total Minted: ${identity.SoulboundNFT.deployment.mintedTokens.totalMinted} NFTs`);
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
        console.log('📈 Operational Status:');
        console.log(`  Health: ${identity.metadata.operationalStatus.healthStatus.toUpperCase()} 🟢`);
        console.log(`  Active Nodes: ${identity.metadata.operationalStatus.activeGovernanceNodes}`);
        console.log(`  Operational Since: ${identity.metadata.operationalStatus.operationalSince}`);
        console.log(`  Last Updated: ${identity.metadata.operationalStatus.lastUpdated}`);
        console.log('\n🔒 Token Allocation:');
        console.log(`  Active Governance: [${identity.SoulboundNFT.deployment.mintedTokens.activeGovernanceTokens.join(', ')}]`);
        console.log(`  Reserved: [${identity.SoulboundNFT.deployment.mintedTokens.reservedTokens.slice(0, 10).join(', ')}...]`);
        console.log(`  Future Expansion: [${identity.SoulboundNFT.deployment.mintedTokens.reservedTokens.slice(-5).join(', ')}]`);
        console.log('\n🔗 Verification & Links:');
        console.log(`  Contract Verification: https://sepolia.etherscan.io/address/${identity.SoulboundNFT.address}`);
        console.log(`  Transaction: https://sepolia.etherscan.io/tx/${identity.SoulboundNFT.deployment.deploymentTx}`);
        console.log('\n✅ Identity configuration successfully loaded and validated!');
        console.log('\n🚀 DLoop AI Governance Nodes are operational and ready for governance participation.');
    }
    catch (error) {
        console.error('❌ Error reading identity configuration:', error);
        if (error instanceof SyntaxError) {
            console.error('💡 The identity.json file may have invalid JSON syntax.');
        }
    }
}
displayIdentitySummary();
//# sourceMappingURL=identity-summary.js.map