"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.monitorSystemStatus = monitorSystemStatus;
const ethers_1 = require("ethers");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
async function monitorSystemStatus() {
    console.log('DLoop AI Governance Node System Monitoring');
    const provider = new ethers_1.ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL);
    // Contract addresses
    const contracts = {
        aiNodeRegistry: '0x0045c7D99489f1d8A5900243956B0206344417DD',
        dloopToken: '0x05B366778566e93abfB8e4A9B794e4ad006446b4',
        soulboundNFT: '0x6391C14631b2Be5374297fA3110687b80233104c'
    };
    const nodeKeys = [
        process.env.AI_NODE_1_PRIVATE_KEY,
        process.env.AI_NODE_2_PRIVATE_KEY,
        process.env.AI_NODE_3_PRIVATE_KEY,
        process.env.AI_NODE_4_PRIVATE_KEY,
        process.env.AI_NODE_5_PRIVATE_KEY
    ];
    const tokenAbi = [
        'function balanceOf(address) view returns (uint256)',
        'function allowance(address, address) view returns (uint256)'
    ];
    const nftAbi = [
        'function balanceOf(address) view returns (uint256)'
    ];
    const registryAbi = [
        'function isNodeRegistered(address) view returns (bool)'
    ];
    const token = new ethers_1.ethers.Contract(contracts.dloopToken, tokenAbi, provider);
    const nft = new ethers_1.ethers.Contract(contracts.soulboundNFT, nftAbi, provider);
    const registry = new ethers_1.ethers.Contract(contracts.aiNodeRegistry, registryAbi, provider);
    const nodeStatuses = [];
    // Monitor each node
    for (let i = 0; i < nodeKeys.length; i++) {
        const wallet = new ethers_1.ethers.Wallet(nodeKeys[i]);
        const nodeName = `ai-gov-${String(i + 1).padStart(2, '0')}`;
        try {
            // Check token balance and approval
            const balance = await token.balanceOf(wallet.address);
            const allowance = await token.allowance(wallet.address, contracts.aiNodeRegistry);
            // Check SoulboundNFT
            const nftBalance = await nft.balanceOf(wallet.address);
            // Check registration status
            let registered = false;
            try {
                registered = await registry.isNodeRegistered(wallet.address);
            }
            catch (error) {
                // Registration function may not be available, assume not registered
                registered = false;
            }
            nodeStatuses.push({
                address: wallet.address,
                name: nodeName,
                tokenBalance: ethers_1.ethers.formatEther(balance),
                tokenApproval: ethers_1.ethers.formatEther(allowance),
                soulboundNFT: nftBalance > 0,
                registered,
                lastActivity: new Date().toISOString()
            });
        }
        catch (error) {
            nodeStatuses.push({
                address: wallet.address,
                name: nodeName,
                tokenBalance: 'Error',
                tokenApproval: 'Error',
                soulboundNFT: false,
                registered: false,
                lastActivity: new Date().toISOString()
            });
        }
    }
    // Generate monitoring report
    console.log('\n' + '='.repeat(80));
    console.log('DLOOP AI GOVERNANCE NODE SYSTEM STATUS REPORT');
    console.log('='.repeat(80));
    console.log(`\nMonitoring Time: ${new Date().toISOString()}`);
    console.log(`Blockchain Network: Sepolia Testnet`);
    const registeredNodes = nodeStatuses.filter(n => n.registered).length;
    const authenticatedNodes = nodeStatuses.filter(n => n.soulboundNFT).length;
    const readyNodes = nodeStatuses.filter(n => parseFloat(n.tokenBalance) >= 1.0 &&
        parseFloat(n.tokenApproval) >= 1.0 &&
        n.soulboundNFT).length;
    console.log(`\nSystem Overview:`);
    console.log(`  Registered Nodes: ${registeredNodes}/5`);
    console.log(`  Authenticated Nodes: ${authenticatedNodes}/5`);
    console.log(`  Ready Nodes: ${readyNodes}/5`);
    console.log(`\nDetailed Node Status:`);
    for (const node of nodeStatuses) {
        const status = node.registered ? 'REGISTERED' :
            (parseFloat(node.tokenBalance) >= 1.0 &&
                parseFloat(node.tokenApproval) >= 1.0 &&
                node.soulboundNFT) ? 'READY' : 'PENDING';
        console.log(`  ${node.name}:`);
        console.log(`    Address: ${node.address}`);
        console.log(`    Status: ${status}`);
        console.log(`    DLOOP Balance: ${node.tokenBalance}`);
        console.log(`    DLOOP Approval: ${node.tokenApproval}`);
        console.log(`    SoulboundNFT: ${node.soulboundNFT ? 'Yes' : 'No'}`);
        console.log();
    }
    // System readiness assessment
    console.log(`Infrastructure Assessment:`);
    if (registeredNodes >= 4) {
        console.log(`  Production Status: FULLY OPERATIONAL`);
        console.log(`  Governance Capability: Complete`);
        console.log(`  Trading Automation: Active`);
    }
    else if (readyNodes >= 4) {
        console.log(`  Production Status: DEPLOYMENT IN PROGRESS`);
        console.log(`  Governance Capability: Ready`);
        console.log(`  Trading Automation: Pending Registration`);
    }
    else if (readyNodes >= 3) {
        console.log(`  Production Status: MINIMUM VIABLE`);
        console.log(`  Governance Capability: Limited`);
        console.log(`  Trading Automation: Reduced Capacity`);
    }
    else {
        console.log(`  Production Status: INITIALIZATION`);
        console.log(`  Governance Capability: Not Ready`);
        console.log(`  Trading Automation: Offline`);
    }
    console.log(`\nContract Integration:`);
    console.log(`  AI Node Registry: ${contracts.aiNodeRegistry}`);
    console.log(`  DLOOP Token: ${contracts.dloopToken}`);
    console.log(`  SoulboundNFT: ${contracts.soulboundNFT}`);
    console.log(`\nNext Steps:`);
    if (registeredNodes === 5) {
        console.log(`  - All nodes operational - monitor performance`);
        console.log(`  - Governance proposals can be submitted`);
        console.log(`  - Automated trading strategies active`);
    }
    else if (readyNodes >= 4) {
        console.log(`  - Monitor blockchain for registration completion`);
        console.log(`  - Verify admin permissions if delays persist`);
        console.log(`  - System ready for partial operations`);
    }
    else {
        console.log(`  - Continue token approvals and authentication`);
        console.log(`  - Verify SoulboundNFT distribution`);
        console.log(`  - Check network connectivity`);
    }
    console.log('\n' + '='.repeat(80));
}
/**
 * Execute system monitoring
 */
async function main() {
    try {
        await monitorSystemStatus();
    }
    catch (error) {
        console.error('System monitoring failed:', error);
        process.exit(1);
    }
}
if (require.main === module) {
    main();
}
//# sourceMappingURL=systemMonitoring.js.map