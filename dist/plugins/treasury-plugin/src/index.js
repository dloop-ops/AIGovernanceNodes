"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.treasuryPlugin = exports.treasuryProvider = exports.treasuryStatusAction = void 0;
const ethers_1 = require("ethers");
exports.treasuryStatusAction = {
    name: "TREASURY_STATUS",
    description: "Check balances and financial status of all governance nodes",
    handler: async (context) => {
        try {
            const rpcUrl = process.env.ETHEREUM_RPC_URL;
            const tokenAddress = process.env.DLOOP_TOKEN_ADDRESS;
            if (!rpcUrl || !tokenAddress) {
                throw new Error('Missing required environment variables');
            }
            const provider = new ethers_1.ethers.JsonRpcProvider(rpcUrl);
            const tokenABI = [
                "function balanceOf(address owner) view returns (uint256)",
                "function decimals() view returns (uint8)"
            ];
            const tokenContract = new ethers_1.ethers.Contract(tokenAddress, tokenABI, provider);
            const balances = [];
            let totalBalance = 0;
            for (let i = 1; i <= 5; i++) {
                try {
                    const privateKey = process.env[`AI_NODE_${i}_PRIVATE_KEY`];
                    if (!privateKey)
                        continue;
                    const wallet = new ethers_1.ethers.Wallet(privateKey, provider);
                    const balance = await tokenContract.balanceOf(wallet.address);
                    const formattedBalance = parseFloat(ethers_1.ethers.formatEther(balance));
                    balances.push({
                        nodeIndex: i,
                        address: wallet.address,
                        balance: formattedBalance,
                        formattedBalance: `${formattedBalance.toLocaleString()} DLOOP`
                    });
                    totalBalance += formattedBalance;
                }
                catch (error) {
                    balances.push({
                        nodeIndex: i,
                        address: 'Error',
                        balance: 0,
                        formattedBalance: 'Error fetching balance'
                    });
                }
            }
            return {
                success: true,
                action: "TREASURY_STATUS",
                totalBalance,
                formattedTotalBalance: `${totalBalance.toLocaleString()} DLOOP`,
                nodeBalances: balances,
                averageBalance: totalBalance / 5,
                timestamp: new Date().toISOString()
            };
        }
        catch (error) {
            console.error('Treasury status check failed:', error);
            return {
                success: false,
                action: "TREASURY_STATUS",
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
};
exports.treasuryProvider = {
    name: "TREASURY_PROVIDER",
    description: "Provides financial context and balance information",
    get: async (runtime, message) => {
        try {
            const statusResult = await exports.treasuryStatusAction.handler({});
            if (!statusResult.success) {
                return "⚠️ Treasury information temporarily unavailable";
            }
            const { totalBalance, nodeBalances } = statusResult;
            const healthyNodes = nodeBalances.filter((n) => n.balance > 100).length;
            return `💰 **Treasury Status**

🏦 **Total Balance**: ${totalBalance.toLocaleString()} DLOOP
📊 **Healthy Nodes**: ${healthyNodes}/5 (balance > 100 DLOOP)
💡 **Average Balance**: ${(totalBalance / 5).toLocaleString()} DLOOP per node
⏰ **Last Updated**: ${new Date().toLocaleString()}

📋 **Node Balances**:
${nodeBalances.map((n) => `• Node ${n.nodeIndex}: ${n.formattedBalance}`).join('\n')}

${healthyNodes < 5 ? '⚠️ Some nodes may need funding' : '✅ All nodes adequately funded'}`;
        }
        catch (error) {
            return `❌ **Treasury Error**: ${error instanceof Error ? error.message : String(error)}`;
        }
    }
};
exports.treasuryPlugin = {
    name: "treasury-plugin",
    description: "Balance monitoring and financial tracking for DLoop governance",
    actions: [exports.treasuryStatusAction],
    providers: [exports.treasuryProvider]
};
exports.default = exports.treasuryPlugin;
//# sourceMappingURL=index.js.map