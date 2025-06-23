#!/usr/bin/env npx ts-node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const AdminSoulboundService_1 = require("./src/services/AdminSoulboundService");
dotenv_1.default.config();
async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
async function authenticateFinalNodes() {
    try {
        console.log('Authenticating final 2 governance nodes...\n');
        const adminService = new AdminSoulboundService_1.AdminSoulboundService();
        const finalNodes = [
            { nodeId: 'ai-gov-04', address: '0xC02764913ce2F23B094F0338a711EFD984024A46' },
            { nodeId: 'ai-gov-05', address: '0x00FfF703fa6837A1a46b3DF9B6a047404046379E' }
        ];
        for (const node of finalNodes) {
            console.log(`Minting SoulBound NFT for ${node.nodeId}...`);
            try {
                const result = await adminService.mintForGovernanceNode(node.address, node.nodeId);
                if (result.success) {
                    console.log(`✅ ${node.nodeId}: Minting successful`);
                    if (result.txHash) {
                        console.log(`   TX Hash: ${result.txHash}`);
                    }
                }
                else {
                    console.log(`❌ ${node.nodeId}: Minting failed`);
                    console.log(`   Error: ${result.error}`);
                }
            }
            catch (error) {
                console.log(`❌ ${node.nodeId}: Exception occurred`);
                console.log(`   Error: ${error instanceof Error ? error.message : String(error)}`);
            }
            if (finalNodes.indexOf(node) < finalNodes.length - 1) {
                console.log('Waiting 45 seconds before next mint...\n');
                await sleep(45000);
            }
        }
        console.log('\nWaiting 90 seconds for transaction confirmations...');
        await sleep(90000);
        // Final verification of all nodes
        console.log('Final verification of all governance nodes...');
        const allNodes = [
            { nodeId: 'ai-gov-01', address: '0x561529036AB886c1FD3D112360383D79fBA9E71c' },
            { nodeId: 'ai-gov-02', address: '0x48B2353954496679CF7C73d239bc12098cB0C5B4' },
            { nodeId: 'ai-gov-03', address: '0x43f76157E9696302E287181828cB3B0C6B89d31e' },
            { nodeId: 'ai-gov-04', address: '0xC02764913ce2F23B094F0338a711EFD984024A46' },
            { nodeId: 'ai-gov-05', address: '0x00FfF703fa6837A1a46b3DF9B6a047404046379E' }
        ];
        const results = [];
        for (const node of allNodes) {
            try {
                const ownership = await adminService.verifyOwnership(node.address);
                results.push({
                    nodeId: node.nodeId,
                    authenticated: ownership.hasNFT,
                    tokenCount: ownership.tokenCount,
                    tokenIds: ownership.tokenIds
                });
            }
            catch (error) {
                results.push({
                    nodeId: node.nodeId,
                    authenticated: false,
                    tokenCount: 0,
                    tokenIds: []
                });
            }
        }
        console.log('\n=== FINAL AUTHENTICATION STATUS ===');
        results.forEach(node => {
            const status = node.authenticated ? '✅' : '❌';
            console.log(`${status} ${node.nodeId}`);
            console.log(`   Authenticated: ${node.authenticated}`);
            console.log(`   Token Count: ${node.tokenCount}`);
            if (node.tokenIds.length > 0) {
                console.log(`   Token IDs: ${node.tokenIds.join(', ')}`);
            }
        });
        const authenticated = results.filter(n => n.authenticated).length;
        console.log(`\nAuthentication Complete:`);
        console.log(`Authenticated Nodes: ${authenticated}/5`);
        console.log(`Success Rate: ${Math.round((authenticated / 5) * 100)}%`);
        if (authenticated === 5) {
            console.log('\n🎉 ALL GOVERNANCE NODES AUTHENTICATED!');
            console.log('The AI governance system is fully operational.');
        }
        else if (authenticated >= 3) {
            console.log('\n✅ MAJORITY AUTHENTICATION ACHIEVED');
            console.log('System can operate with current authentication level.');
        }
    }
    catch (error) {
        console.error('Final authentication failed:', error);
        process.exit(1);
    }
}
if (require.main === module) {
    authenticateFinalNodes()
        .then(() => {
        console.log('\nAuthentication process completed.');
        process.exit(0);
    })
        .catch((error) => {
        console.error('Process failed:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=finalTwoNodes.js.map