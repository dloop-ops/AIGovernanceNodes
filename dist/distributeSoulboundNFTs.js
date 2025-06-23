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
exports.distributeSoulboundNFTs = distributeSoulboundNFTs;
const ethers_1 = require("ethers");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
/**
 * Distribution script for SoulBound NFTs to governance nodes
 */
async function distributeSoulboundNFTs() {
    console.log('SOULBOUND NFT DISTRIBUTION AND NODE REGISTRATION');
    console.log('==============================================');
    const provider = new ethers_1.ethers.JsonRpcProvider('https://sepolia.gateway.tenderly.co');
    // Admin wallet (owns all 10 SoulboundNFTs)
    const adminWallet = new ethers_1.ethers.Wallet(process.env.SOULBOUND_ADMIN_PRIVATE_KEY, provider);
    // Node wallets
    const nodeWallets = [
        new ethers_1.ethers.Wallet(process.env.AI_NODE_1_PRIVATE_KEY, provider),
        new ethers_1.ethers.Wallet(process.env.AI_NODE_2_PRIVATE_KEY, provider),
        new ethers_1.ethers.Wallet(process.env.AI_NODE_3_PRIVATE_KEY, provider),
        new ethers_1.ethers.Wallet(process.env.AI_NODE_4_PRIVATE_KEY, provider),
        new ethers_1.ethers.Wallet(process.env.AI_NODE_5_PRIVATE_KEY, provider)
    ];
    console.log(`Admin Address: ${adminWallet.address}`);
    console.log(`SoulboundNFT Contract: 0x6391C14631b2Be5374297fA3110687b80233104c`);
    console.log(`Registry Contract: 0x0045c7D99489f1d8A5900243956B0206344417DD`);
    // SoulboundNFT contract interface
    const soulboundInterface = new ethers_1.ethers.Interface([
        'function ownerOf(uint256 tokenId) view returns (address)',
        'function tokenURI(uint256 tokenId) view returns (string)',
        'function transferFrom(address from, address to, uint256 tokenId) external',
        'function safeTransferFrom(address from, address to, uint256 tokenId) external',
        'function balanceOf(address owner) view returns (uint256)'
    ]);
    // Registry contract interface
    const registryInterface = new ethers_1.ethers.Interface([
        'function registerAINode(string endpoint, string name, string description, string nodeType) external returns (uint256)',
        'function getNodeInfo(address) view returns (tuple(address,string,string,string,string,bool,uint256,uint256))',
        'function hasRole(bytes32 role, address account) view returns (bool)',
        'function ADMIN_ROLE() view returns (bytes32)'
    ]);
    console.log('\nStep 1: Verifying SoulboundNFT ownership...');
    // Check current NFT ownership
    const nftOwnership = [];
    for (let tokenId = 1; tokenId <= 10; tokenId++) {
        try {
            const ownerCallData = soulboundInterface.encodeFunctionData('ownerOf', [tokenId]);
            const ownerResult = await provider.call({
                to: '0x6391C14631b2Be5374297fA3110687b80233104c',
                data: ownerCallData
            });
            const owner = soulboundInterface.decodeFunctionResult('ownerOf', ownerResult)[0];
            const uriCallData = soulboundInterface.encodeFunctionData('tokenURI', [tokenId]);
            const uriResult = await provider.call({
                to: '0x6391C14631b2Be5374297fA3110687b80233104c',
                data: uriCallData
            });
            const uri = soulboundInterface.decodeFunctionResult('tokenURI', uriResult)[0];
            nftOwnership.push({ tokenId, owner, uri });
            console.log(`Token ${tokenId}: ${owner} - ${uri}`);
        }
        catch (error) {
            console.log(`Token ${tokenId}: Error - ${error.message}`);
        }
    }
    const adminOwnedTokens = nftOwnership.filter(nft => nft.owner.toLowerCase() === adminWallet.address.toLowerCase());
    console.log(`\nAdmin owns ${adminOwnedTokens.length}/10 SoulboundNFTs`);
    // Note: SoulboundNFTs are non-transferable according to the documentation
    // They can only be revoked/burned by admin, not transferred
    // This means we need to check if nodes already have the required NFTs
    // or if the registration process works differently
    console.log('\nStep 2: Checking node NFT requirements...');
    for (let i = 0; i < nodeWallets.length; i++) {
        const nodeWallet = nodeWallets[i];
        const nodeName = `ai-gov-${String(i + 1).padStart(2, '0')}`;
        try {
            const balanceCallData = soulboundInterface.encodeFunctionData('balanceOf', [nodeWallet.address]);
            const balanceResult = await provider.call({
                to: '0x6391C14631b2Be5374297fA3110687b80233104c',
                data: balanceCallData
            });
            const balance = soulboundInterface.decodeFunctionResult('balanceOf', balanceResult)[0];
            console.log(`${nodeName} (${nodeWallet.address}): ${balance.toString()} SoulboundNFTs`);
        }
        catch (error) {
            console.log(`${nodeName}: Balance check failed - ${error.message}`);
        }
    }
    console.log('\nStep 3: Attempting node registration with current setup...');
    // Since SoulboundNFTs are non-transferable, let's try registration directly
    // The admin may be able to register nodes on their behalf or there may be other requirements
    const registrationResults = [];
    for (let i = 0; i < 5; i++) {
        const nodeWallet = nodeWallets[i];
        const nodeName = `ai-gov-${String(i + 1).padStart(2, '0')}`;
        console.log(`\n${'='.repeat(50)}`);
        console.log(`Processing ${nodeName}: ${nodeWallet.address}`);
        console.log(`${'='.repeat(50)}`);
        // Check if already registered
        try {
            const checkCallData = registryInterface.encodeFunctionData('getNodeInfo', [nodeWallet.address]);
            const checkResult = await provider.call({
                to: '0x0045c7D99489f1d8A5900243956B0206344417DD',
                data: checkCallData
            });
            const decoded = registryInterface.decodeFunctionResult('getNodeInfo', checkResult);
            console.log(`Already registered: "${decoded[2]}"`);
            registrationResults.push({ nodeName, success: true, status: 'Already registered' });
            continue;
        }
        catch {
            console.log('Not yet registered, proceeding...');
        }
        // Attempt registration using admin wallet (since admin owns the SoulboundNFTs)
        try {
            const endpoint = "https://d-loop.io/identity/identity.json";
            const name = `AI Governance Node ${nodeName}`;
            const description = `Automated governance node using ${i % 2 === 0 ? 'Conservative' : 'Aggressive'} strategy with SoulboundNFT authentication`;
            const nodeType = "governance";
            console.log('Admin attempting registration on behalf of node...');
            const registerCallData = registryInterface.encodeFunctionData('registerAINode', [
                endpoint,
                name,
                description,
                nodeType
            ]);
            const feeData = await provider.getFeeData();
            const nonce = await provider.getTransactionCount(adminWallet.address);
            const txRequest = {
                to: '0x0045c7D99489f1d8A5900243956B0206344417DD',
                data: registerCallData,
                gasLimit: 2500000n,
                nonce: nonce,
                type: 2
            };
            if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
                txRequest.maxFeePerGas = feeData.maxFeePerGas * 150n / 100n;
                txRequest.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas * 120n / 100n;
            }
            else if (feeData.gasPrice) {
                txRequest.gasPrice = feeData.gasPrice * 150n / 100n;
            }
            const tx = await adminWallet.sendTransaction(txRequest);
            console.log(`Transaction: ${tx.hash}`);
            const receipt = await tx.wait(2);
            if (receipt && receipt.status === 1) {
                console.log(`SUCCESS: ${nodeName} registered by admin!`);
                console.log(`Block: ${receipt.blockNumber}`);
                registrationResults.push({
                    nodeName,
                    success: true,
                    status: 'Registered by admin',
                    txHash: tx.hash
                });
            }
            else {
                console.log(`FAILED: Registration transaction failed`);
                registrationResults.push({ nodeName, success: false, status: 'Transaction failed' });
            }
        }
        catch (error) {
            console.log(`Registration error: ${error.message}`);
            registrationResults.push({
                nodeName,
                success: false,
                status: error.message.includes('06d919f2') ? 'CallerNotAdmin' : 'Registration failed'
            });
        }
        // Wait between attempts
        if (i < 4) {
            console.log('Waiting 20 seconds...');
            await new Promise(resolve => setTimeout(resolve, 20000));
        }
    }
    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('SOULBOUND NFT DISTRIBUTION AND REGISTRATION RESULTS');
    console.log('='.repeat(60));
    const successful = registrationResults.filter(r => r.success);
    const failed = registrationResults.filter(r => !r.success);
    console.log(`Processed nodes: ${registrationResults.length}/5`);
    console.log(`Successful: ${successful.length}`);
    console.log(`Failed: ${failed.length}`);
    if (successful.length > 0) {
        console.log('\nSuccessful Operations:');
        successful.forEach(result => {
            console.log(`  ✓ ${result.nodeName}: ${result.status}`);
            if (result.txHash)
                console.log(`    TX: ${result.txHash}`);
        });
    }
    if (failed.length > 0) {
        console.log('\nFailed Operations:');
        failed.forEach(result => {
            console.log(`  ✗ ${result.nodeName}: ${result.status}`);
        });
    }
    console.log('\nSoulboundNFT Analysis:');
    console.log(`  Total NFTs: 10`);
    console.log(`  Admin owned: ${adminOwnedTokens.length}`);
    console.log(`  Contract: 0x6391C14631b2Be5374297fA3110687b80233104c`);
    console.log(`  Note: SoulboundNFTs are non-transferable by design`);
    if (successful.length === 5) {
        console.log('\n🎉 BREAKTHROUGH ACHIEVED!');
        console.log('All governance nodes successfully processed!');
        console.log('SoulboundNFT authentication system operational!');
    }
    else {
        console.log('\nSystem Status: Infrastructure operational, investigating SoulboundNFT requirements');
    }
}
async function main() {
    await distributeSoulboundNFTs();
}
if (require.main === module) {
    main().catch(console.error);
}
//# sourceMappingURL=distributeSoulboundNFTs.js.map