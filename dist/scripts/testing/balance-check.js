"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ethers_1 = require("ethers");
console.log('💰 GOVERNANCE NODE BALANCE CHECKER');
console.log('==================================');
async function checkAllNodeBalances() {
    try {
        const provider = new ethers_1.ethers.JsonRpcProvider('https://ethereum-sepolia-rpc.publicnode.com');
        console.log('🔗 Connected to PublicNode Sepolia');
        const nodeAddresses = [
            process.env.AI_NODE_1_PRIVATE_KEY ? new ethers_1.ethers.Wallet(process.env.AI_NODE_1_PRIVATE_KEY).address : null,
            process.env.AI_NODE_2_PRIVATE_KEY ? new ethers_1.ethers.Wallet(process.env.AI_NODE_2_PRIVATE_KEY).address : null,
            process.env.AI_NODE_3_PRIVATE_KEY ? new ethers_1.ethers.Wallet(process.env.AI_NODE_3_PRIVATE_KEY).address : null,
            process.env.AI_NODE_4_PRIVATE_KEY ? new ethers_1.ethers.Wallet(process.env.AI_NODE_4_PRIVATE_KEY).address : null,
            process.env.AI_NODE_5_PRIVATE_KEY ? new ethers_1.ethers.Wallet(process.env.AI_NODE_5_PRIVATE_KEY).address : null,
        ];
        console.log('\n📊 NODE BALANCE SUMMARY:');
        console.log('Node | Address           | ETH Balance | Status');
        console.log('-----|-------------------|-------------|--------');
        let totalLowBalance = 0;
        const lowBalanceNodes = [];
        for (let i = 0; i < nodeAddresses.length; i++) {
            const address = nodeAddresses[i];
            if (!address) {
                console.log(`  ${i + 1}  | N/A               | N/A         | ❌ No private key`);
                continue;
            }
            try {
                const balance = await provider.getBalance(address);
                const balanceEth = ethers_1.ethers.formatEther(balance);
                const balanceNum = parseFloat(balanceEth);
                let status = '✅ Good';
                if (balanceNum < 0.001) {
                    status = '❌ Too Low';
                    totalLowBalance++;
                    lowBalanceNodes.push({
                        node: i + 1,
                        address: address,
                        balance: balanceEth
                    });
                }
                else if (balanceNum < 0.01) {
                    status = '⚠️  Low';
                }
                console.log(`  ${i + 1}  | ${address.slice(0, 10)}...${address.slice(-6)} | ${balanceEth.padEnd(11)} | ${status}`);
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            catch (error) {
                console.log(`  ${i + 1}  | ${address.slice(0, 10)}...${address.slice(-6)} | ERROR       | ❌ RPC Error`);
            }
        }
        console.log('\n📋 FUNDING RECOMMENDATIONS:');
        if (lowBalanceNodes.length === 0) {
            console.log('✅ All nodes have sufficient ETH balance for voting!');
        }
        else {
            console.log(`❌ ${lowBalanceNodes.length} node(s) need ETH funding:`);
            for (const node of lowBalanceNodes) {
                console.log(`\n🤖 Node ${node.node}:`);
                console.log(`   Address: ${node.address}`);
                console.log(`   Current: ${node.balance} ETH`);
                console.log(`   Needed:  ~0.01 ETH for gas fees`);
                console.log(`   Action:  Send 0.02 ETH to this address on Sepolia testnet`);
            }
            console.log('\n💡 HOW TO GET SEPOLIA ETH:');
            console.log('   1. Visit: https://sepoliafaucet.com/');
            console.log('   2. Or: https://faucet.quicknode.com/ethereum/sepolia');
            console.log('   3. Enter the node address and request test ETH');
            console.log('   4. Wait 1-2 minutes for confirmation');
        }
        console.log('\n🎯 NEXT STEPS:');
        console.log('   1. Fund any low-balance nodes using faucets above');
        console.log('   2. Run: node scripts/testing/voting-test.js');
        console.log('   3. All nodes should then be able to vote successfully');
    }
    catch (error) {
        console.error('❌ Balance check failed:', error.message);
    }
}
checkAllNodeBalances().then(() => {
    console.log('\n💰 Balance check complete');
    process.exit(0);
}).catch((error) => {
    console.error('❌ Balance check crashed:', error.message);
    process.exit(1);
});
//# sourceMappingURL=balance-check.js.map