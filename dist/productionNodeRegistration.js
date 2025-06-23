"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeProductionRegistration = executeProductionRegistration;
const ethers_1 = require("ethers");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
async function executeProductionRegistration() {
    console.log('='.repeat(80));
    console.log('DLOOP AI GOVERNANCE NODE PRODUCTION REGISTRATION');
    console.log('='.repeat(80));
    // Initialize providers with robust error handling
    const providerUrls = [
        process.env.ETHEREUM_RPC_URL,
        `https://sepolia.infura.io/v3/${process.env.BACKUP_INFURA_KEY}`,
        'https://ethereum-sepolia-rpc.publicnode.com',
        'https://sepolia.infura.io/v3/ca485bd6567e4c5fb5693ee66a5885d8'
    ];
    let provider = null;
    for (const url of providerUrls) {
        try {
            const testProvider = new ethers_1.ethers.JsonRpcProvider(url);
            await testProvider.getBlockNumber();
            provider = testProvider;
            console.log(`✓ Connected to RPC provider: ${url.includes('infura') ? 'Infura' : url.includes('publicnode') ? 'PublicNode' : 'Sepolia'}`);
            break;
        }
        catch (error) {
            console.log(`✗ Provider failed: ${url.includes('infura') ? 'Infura' : 'Other'}`);
        }
    }
    if (!provider) {
        console.log('❌ No working RPC providers available');
        return;
    }
    // Contract addresses
    const contracts = {
        aiNodeRegistry: '0x0045c7D99489f1d8A5900243956B0206344417DD',
        dloopToken: '0x05B366778566e93abfB8e4A9B794e4ad006446b4',
        soulboundNFT: '0x6391C14631b2Be5374297fA3110687b80233104c'
    };
    // Load node private keys
    const nodeKeys = [
        process.env.AI_NODE_1_PRIVATE_KEY,
        process.env.AI_NODE_2_PRIVATE_KEY,
        process.env.AI_NODE_3_PRIVATE_KEY,
        process.env.AI_NODE_4_PRIVATE_KEY,
        process.env.AI_NODE_5_PRIVATE_KEY
    ];
    const adminKey = process.env.SOULBOUND_ADMIN_PRIVATE_KEY;
    const adminWallet = new ethers_1.ethers.Wallet(adminKey, provider);
    console.log('\n1. VERIFYING SYSTEM PREREQUISITES');
    console.log('-'.repeat(50));
    // Verify network connection
    const network = await provider.getNetwork();
    const blockNumber = await provider.getBlockNumber();
    console.log(`Network: ${network.name} (Chain ID: ${network.chainId})`);
    console.log(`Current Block: ${blockNumber}`);
    console.log(`Admin Address: ${adminWallet.address}`);
    // Contract ABIs
    const tokenAbi = [
        'function balanceOf(address) view returns (uint256)',
        'function allowance(address, address) view returns (uint256)'
    ];
    const nftAbi = [
        'function balanceOf(address) view returns (uint256)'
    ];
    const registryAbi = [
        'function registerNodeWithStaking(address nodeAddress, string metadata, uint256 stakeAmount) external',
        'function registerNode(address nodeAddress, string metadata) external',
        'function isNodeRegistered(address nodeAddress) view returns (bool)',
        'function getNodeCount() view returns (uint256)',
        'function hasRole(bytes32 role, address account) view returns (bool)',
        'function ADMIN_ROLE() view returns (bytes32)',
        'function grantRole(bytes32 role, address account) external'
    ];
    const token = new ethers_1.ethers.Contract(contracts.dloopToken, tokenAbi, provider);
    const nft = new ethers_1.ethers.Contract(contracts.soulboundNFT, nftAbi, provider);
    const registry = new ethers_1.ethers.Contract(contracts.aiNodeRegistry, registryAbi, adminWallet);
    console.log('\n2. CHECKING NODE AUTHENTICATION STATUS');
    console.log('-'.repeat(50));
    const nodeStatuses = [];
    let readyNodes = 0;
    for (let i = 0; i < nodeKeys.length; i++) {
        const wallet = new ethers_1.ethers.Wallet(nodeKeys[i]);
        const nodeName = `ai-gov-${String(i + 1).padStart(2, '0')}`;
        try {
            const balance = await token.balanceOf(wallet.address);
            const allowance = await token.allowance(wallet.address, contracts.aiNodeRegistry);
            const nftBalance = await nft.balanceOf(wallet.address);
            const balanceFormatted = ethers_1.ethers.formatEther(balance);
            const allowanceFormatted = ethers_1.ethers.formatEther(allowance);
            const hasNFT = nftBalance > 0;
            const isReady = parseFloat(balanceFormatted) >= 1000 && parseFloat(allowanceFormatted) >= 1.0 && hasNFT;
            nodeStatuses.push({
                index: i,
                name: nodeName,
                address: wallet.address,
                balance: balanceFormatted,
                allowance: allowanceFormatted,
                hasNFT,
                isReady
            });
            console.log(`${nodeName}: Balance=${balanceFormatted} DLOOP, Approval=${allowanceFormatted}, NFT=${hasNFT ? 'Yes' : 'No'}, Ready=${isReady ? 'Yes' : 'No'}`);
            if (isReady)
                readyNodes++;
        }
        catch (error) {
            console.log(`${nodeName}: Status check failed`);
            nodeStatuses.push({
                index: i,
                name: nodeName,
                address: wallet.address,
                isReady: false
            });
        }
    }
    console.log(`\n✓ Ready nodes: ${readyNodes}/5`);
    console.log('\n3. VERIFYING ADMIN PERMISSIONS');
    console.log('-'.repeat(50));
    try {
        const adminRole = await registry.ADMIN_ROLE();
        const hasAdminRole = await registry.hasRole(adminRole, adminWallet.address);
        console.log(`Admin Role Hash: ${adminRole}`);
        console.log(`Admin has ADMIN_ROLE: ${hasAdminRole}`);
        if (!hasAdminRole) {
            console.log('⚠ Admin role not assigned - this may cause registration failures');
        }
    }
    catch (error) {
        console.log('Admin role verification failed - continuing with registration attempts');
    }
    console.log('\n4. EXECUTING NODE REGISTRATIONS');
    console.log('-'.repeat(50));
    const registrationResults = [];
    let successfulRegistrations = 0;
    for (const nodeStatus of nodeStatuses) {
        if (!nodeStatus.isReady) {
            registrationResults.push({
                nodeIndex: nodeStatus.index,
                nodeName: nodeStatus.name,
                address: nodeStatus.address,
                success: false,
                status: 'Prerequisites not met',
                error: 'Insufficient balance, approval, or missing NFT'
            });
            continue;
        }
        const nodeWallet = new ethers_1.ethers.Wallet(nodeKeys[nodeStatus.index]);
        const strategy = (nodeStatus.index % 2 === 0) ? 'conservative' : 'aggressive';
        const metadata = JSON.stringify({
            name: `AI Governance Node ${nodeStatus.name}`,
            description: `Automated governance node using ${strategy} strategy`,
            endpoint: 'https://d-loop.io/identity/identity.json',
            nodeType: 'governance',
            strategy: strategy,
            version: '1.0.0',
            registeredAt: Date.now()
        });
        console.log(`\nRegistering ${nodeStatus.name}...`);
        try {
            // Check if already registered
            let isAlreadyRegistered = false;
            try {
                isAlreadyRegistered = await registry.isNodeRegistered(nodeWallet.address);
                if (isAlreadyRegistered) {
                    console.log(`✓ ${nodeStatus.name} already registered`);
                    registrationResults.push({
                        nodeIndex: nodeStatus.index,
                        nodeName: nodeStatus.name,
                        address: nodeStatus.address,
                        success: true,
                        status: 'Already registered'
                    });
                    successfulRegistrations++;
                    continue;
                }
            }
            catch (error) {
                // Function may not be available, continue with registration
            }
            // Attempt registration with staking
            console.log(`Attempting staking registration for ${nodeStatus.name}...`);
            const stakeAmount = ethers_1.ethers.parseEther('1.0');
            // Estimate gas first
            let gasEstimate;
            try {
                gasEstimate = await registry.registerNodeWithStaking.estimateGas(nodeWallet.address, metadata, stakeAmount);
                console.log(`Gas estimate: ${gasEstimate.toString()}`);
            }
            catch (error) {
                console.log(`Gas estimation failed, using fallback registration method`);
                // Try basic registration without staking
                try {
                    gasEstimate = await registry.registerNode.estimateGas(nodeWallet.address, metadata);
                    const tx = await registry.registerNode(nodeWallet.address, metadata, { gasLimit: gasEstimate + BigInt(50000) });
                    const receipt = await tx.wait();
                    console.log(`✓ ${nodeStatus.name} registered (basic): ${receipt.hash}`);
                    registrationResults.push({
                        nodeIndex: nodeStatus.index,
                        nodeName: nodeStatus.name,
                        address: nodeStatus.address,
                        success: true,
                        txHash: receipt.hash,
                        status: 'Registered (basic)'
                    });
                    successfulRegistrations++;
                    continue;
                }
                catch (basicError) {
                    console.log(`✗ ${nodeStatus.name} basic registration failed: ${basicError.message}`);
                    registrationResults.push({
                        nodeIndex: nodeStatus.index,
                        nodeName: nodeStatus.name,
                        address: nodeStatus.address,
                        success: false,
                        status: 'Registration failed',
                        error: basicError.message
                    });
                    continue;
                }
            }
            // Execute staking registration
            const tx = await registry.registerNodeWithStaking(nodeWallet.address, metadata, stakeAmount, { gasLimit: gasEstimate + BigInt(100000) });
            console.log(`Transaction submitted: ${tx.hash}`);
            const receipt = await tx.wait();
            console.log(`✓ ${nodeStatus.name} registered with staking: ${receipt.hash}`);
            registrationResults.push({
                nodeIndex: nodeStatus.index,
                nodeName: nodeStatus.name,
                address: nodeStatus.address,
                success: true,
                txHash: receipt.hash,
                status: 'Registered with staking'
            });
            successfulRegistrations++;
        }
        catch (error) {
            console.log(`✗ ${nodeStatus.name} registration failed: ${error.message}`);
            registrationResults.push({
                nodeIndex: nodeStatus.index,
                nodeName: nodeStatus.name,
                address: nodeStatus.address,
                success: false,
                status: 'Registration failed',
                error: error.message
            });
        }
        // Rate limiting delay
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    console.log('\n5. FINAL VERIFICATION');
    console.log('-'.repeat(50));
    try {
        const totalNodes = await registry.getNodeCount();
        console.log(`Total nodes in registry: ${totalNodes}`);
    }
    catch (error) {
        console.log('Node count verification failed');
    }
    console.log('\n' + '='.repeat(80));
    console.log('PRODUCTION REGISTRATION RESULTS');
    console.log('='.repeat(80));
    console.log(`\nRegistration Summary:`);
    console.log(`  Successful: ${successfulRegistrations}/5`);
    console.log(`  Failed: ${5 - successfulRegistrations}/5`);
    console.log(`  Ready nodes: ${readyNodes}/5`);
    console.log(`\nDetailed Results:`);
    registrationResults.forEach(result => {
        const status = result.success ? '✓' : '✗';
        console.log(`  ${status} ${result.nodeName}: ${result.status}`);
        if (result.txHash) {
            console.log(`    Transaction: ${result.txHash}`);
        }
        if (result.error) {
            console.log(`    Error: ${result.error}`);
        }
    });
    if (successfulRegistrations >= 3) {
        console.log(`\n🎉 PRODUCTION DEPLOYMENT SUCCESSFUL`);
        console.log(`   ${successfulRegistrations} governance nodes operational`);
        console.log(`   System ready for automated trading and governance`);
    }
    else if (successfulRegistrations >= 1) {
        console.log(`\n⚠️  PARTIAL DEPLOYMENT COMPLETE`);
        console.log(`   ${successfulRegistrations} nodes registered - monitoring for additional registrations`);
    }
    else {
        console.log(`\n❌ REGISTRATION INCOMPLETE`);
        console.log(`   Review admin permissions and contract requirements`);
    }
    console.log(`\nNext Steps:`);
    if (successfulRegistrations >= 3) {
        console.log(`- All systems operational for governance and trading`);
        console.log(`- Monitor performance and automated operations`);
    }
    else {
        console.log(`- Verify admin role assignments`);
        console.log(`- Check contract permission requirements`);
        console.log(`- Monitor blockchain for pending transactions`);
    }
    console.log('\n' + '='.repeat(80));
}
/**
 * Main execution
 */
async function main() {
    try {
        await executeProductionRegistration();
    }
    catch (error) {
        console.error('Production registration failed:', error);
        process.exit(1);
    }
}
if (require.main === module) {
    main();
}
//# sourceMappingURL=productionNodeRegistration.js.map