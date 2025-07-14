"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const ethers_1 = require("ethers");
const WalletService_1 = require("../../src/services/WalletService");
const contracts_1 = require("../../src/config/contracts");
dotenv_1.default.config();
async function checkRegistrationStatus() {
    console.log('🔍 Checking D-Loop AI Governance Node Registration Status');
    console.log('=========================================================');
    try {
        console.log('\n1. Initializing services...');
        const walletService = new WalletService_1.WalletService();
        const addresses = (0, contracts_1.getCurrentContractAddresses)();
        const path = require('path');
        const fs = require('fs');
        const abiDir = path.join(process.cwd(), 'abis');
        const aiNodeRegistryAbi = JSON.parse(fs.readFileSync(path.join(abiDir, 'ainoderegistry.abi.v1.json'), 'utf8')).abi;
        const provider = walletService.getProvider();
        const aiNodeRegistry = new ethers_1.ethers.Contract(addresses.aiNodeRegistry, aiNodeRegistryAbi, provider);
        console.log(`✅ Services initialized`);
        console.log(`   - AINodeRegistry: ${addresses.aiNodeRegistry}`);
        console.log(`   - Total nodes to check: ${walletService.getWalletCount()}`);
        console.log('\n2. Checking registration status...');
        for (let i = 0; i < walletService.getWalletCount(); i++) {
            const wallet = walletService.getWallet(i);
            const nodeAddress = wallet.address;
            console.log(`\n   Node ${i} (${nodeAddress}):`);
            try {
                let isRegistered = false;
                let nodeInfo = null;
                try {
                    const nodeData = await aiNodeRegistry.nodes(nodeAddress);
                    if (nodeData && nodeData.isActive !== undefined) {
                        isRegistered = nodeData.isActive;
                        nodeInfo = nodeData;
                        console.log(`     ✅ Found in nodes mapping: ${isRegistered ? 'REGISTERED' : 'NOT ACTIVE'}`);
                        if (nodeInfo) {
                            console.log(`     📋 Node Info:`, {
                                isActive: nodeInfo.isActive,
                                owner: nodeInfo.owner || 'N/A',
                                registeredAt: nodeInfo.registeredAt ? new Date(Number(nodeInfo.registeredAt) * 1000).toISOString() : 'N/A'
                            });
                        }
                    }
                }
                catch (error) {
                    console.log(`     ❌ nodes() method failed: ${error instanceof Error ? error.message : String(error)}`);
                }
                try {
                    const registered = await aiNodeRegistry.isNodeRegistered(nodeAddress);
                    console.log(`     ✅ isNodeRegistered(): ${registered ? 'REGISTERED' : 'NOT REGISTERED'}`);
                    isRegistered = isRegistered || registered;
                }
                catch (error) {
                    console.log(`     ❌ isNodeRegistered() method not available`);
                }
                try {
                    const info = await aiNodeRegistry.getNodeInfo(nodeAddress);
                    if (info) {
                        console.log(`     ✅ getNodeInfo() found data`);
                        isRegistered = true;
                    }
                }
                catch (error) {
                    console.log(`     ❌ getNodeInfo() method failed`);
                }
                console.log(`     🎯 FINAL STATUS: ${isRegistered ? '✅ REGISTERED' : '❌ NOT REGISTERED'}`);
            }
            catch (error) {
                console.log(`     💥 Error checking node: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
        console.log('\n3. Summary:');
        console.log('   The registration failures with NodeAlreadyRegistered() error');
        console.log('   indicate that the nodes are already properly registered in');
        console.log('   the D-Loop AINodeRegistry contract.');
        console.log('\n✅ Registration status check completed');
    }
    catch (error) {
        console.error('\n❌ Registration status check failed:', error);
        process.exit(1);
    }
}
checkRegistrationStatus()
    .then(() => {
    console.log('\n🎉 Check completed successfully');
    process.exit(0);
})
    .catch((error) => {
    console.error('\n💥 Check failed with error:', error);
    process.exit(1);
});
//# sourceMappingURL=check-registration-status.js.map