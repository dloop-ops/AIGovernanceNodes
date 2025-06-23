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
async function retryWithBackoff(operation, maxRetries = 5, baseDelay = 10000) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await operation();
        }
        catch (error) {
            if (attempt === maxRetries - 1)
                throw error;
            const delay = baseDelay * Math.pow(2, attempt);
            console.log(`Attempt ${attempt + 1} failed, retrying in ${delay / 1000} seconds...`);
            await sleep(delay);
        }
    }
    throw new Error('Max retries exceeded');
}
async function retryAuthentication() {
    try {
        console.log('Retrying SoulBound NFT authentication with backoff strategy...\n');
        const adminService = new AdminSoulboundService_1.AdminSoulboundService();
        // Target the remaining unauthenticated nodes
        const remainingNodes = [
            { nodeId: 'ai-gov-03', address: '0x43f76157E9696302E287181828cB3B0C6B89d31e' },
            { nodeId: 'ai-gov-04', address: '0xC02764913ce2F23B094F0338a711EFD984024A46' },
            { nodeId: 'ai-gov-05', address: '0x00FfF703fa6837A1a46b3DF9B6a047404046379E' }
        ];
        // Verify current status first
        console.log('Checking current authentication status...');
        for (const node of remainingNodes) {
            try {
                const ownership = await retryWithBackoff(() => adminService.verifyOwnership(node.address), 3, 5000);
                const status = ownership.hasNFT ? '✅' : '❌';
                console.log(`${status} ${node.nodeId}: ${ownership.tokenCount} tokens`);
            }
            catch (error) {
                console.log(`❓ ${node.nodeId}: Status check failed`);
            }
        }
        console.log('\nMinting SoulBound NFTs for unauthenticated nodes...');
        // Mint with retry logic
        for (const node of remainingNodes) {
            console.log(`\nProcessing ${node.nodeId}...`);
            try {
                const result = await retryWithBackoff(() => adminService.mintForGovernanceNode(node.address, node.nodeId), 5, 15000);
                if (result.success) {
                    console.log(`✅ ${node.nodeId}: Minting successful`);
                    console.log(`   Token ID: ${result.tokenId}`);
                    if (result.txHash) {
                        console.log(`   TX Hash: ${result.txHash}`);
                    }
                }
                else {
                    console.log(`⚠️ ${node.nodeId}: Minting completed but may have issues`);
                    console.log(`   Details: ${result.error}`);
                }
            }
            catch (error) {
                console.log(`❌ ${node.nodeId}: Failed after retries`);
                console.log(`   Error: ${error instanceof Error ? error.message : String(error)}`);
            }
            // Wait between nodes to avoid overwhelming the RPC
            console.log('Waiting 30 seconds before next node...');
            await sleep(30000);
        }
        // Final comprehensive verification
        console.log('\nWaiting 60 seconds for transaction confirmations...');
        await sleep(60000);
        console.log('\nFinal authentication verification...');
        const allNodes = [
            { nodeId: 'ai-gov-01', address: '0x561529036AB886c1FD3D112360383D79fBA9E71c' },
            { nodeId: 'ai-gov-02', address: '0x48B2353954496679CF7C73d239bc12098cB0C5B4' },
            ...remainingNodes
        ];
        const finalResults = [];
        for (const node of allNodes) {
            try {
                const ownership = await retryWithBackoff(() => adminService.verifyOwnership(node.address), 3, 5000);
                finalResults.push({
                    nodeId: node.nodeId,
                    address: node.address,
                    authenticated: ownership.hasNFT,
                    tokenCount: ownership.tokenCount,
                    tokenIds: ownership.tokenIds
                });
            }
            catch (error) {
                finalResults.push({
                    nodeId: node.nodeId,
                    address: node.address,
                    authenticated: false,
                    tokenCount: 0,
                    tokenIds: [],
                    error: 'Verification failed'
                });
            }
        }
        console.log('\n=== FINAL AUTHENTICATION STATUS ===');
        finalResults.forEach(node => {
            const status = node.authenticated ? '✅' : '❌';
            console.log(`${status} ${node.nodeId}: ${node.address}`);
            console.log(`   Authenticated: ${node.authenticated}`);
            console.log(`   Token Count: ${node.tokenCount}`);
            if (node.tokenIds && node.tokenIds.length > 0) {
                console.log(`   Token IDs: ${node.tokenIds.join(', ')}`);
            }
            if ('error' in node && node.error) {
                console.log(`   Error: ${node.error}`);
            }
            console.log('');
        });
        const totalAuthenticated = finalResults.filter(node => node.authenticated).length;
        const successRate = Math.round((totalAuthenticated / 5) * 100);
        console.log(`Authentication Summary:`);
        console.log(`Total Nodes: 5`);
        console.log(`Authenticated: ${totalAuthenticated}`);
        console.log(`Unauthenticated: ${5 - totalAuthenticated}`);
        console.log(`Success Rate: ${successRate}%`);
        if (totalAuthenticated === 5) {
            console.log('\n🎉 SUCCESS: All governance nodes are authenticated!');
            console.log('The AI governance system is ready for automated operations.');
        }
        else if (totalAuthenticated >= 3) {
            console.log('\n✅ PARTIAL SUCCESS: Majority of nodes are authenticated.');
            console.log('The system can operate with reduced capacity.');
        }
        else {
            console.log('\n⚠️ LIMITED SUCCESS: Additional authentication required.');
        }
    }
    catch (error) {
        console.error('Authentication retry process failed:', error);
        process.exit(1);
    }
}
if (require.main === module) {
    retryAuthentication()
        .then(() => {
        console.log('\nAuthentication retry process completed.');
        process.exit(0);
    })
        .catch((error) => {
        console.error('Retry process failed:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=retryAuthentication.js.map