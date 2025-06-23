/**
 * DLoop Treasury Plugin
 *
 * Balance monitoring and financial tracking for DLoop AI governance nodes
 */
import { ethers } from 'ethers';
/**
 * Treasury Status Action
 */
export const treasuryStatusAction = {
    name: "TREASURY_STATUS",
    description: "Check balances and financial status of all governance nodes",
    handler: async (context) => {
        try {
            const rpcUrl = process.env.ETHEREUM_RPC_URL;
            const tokenAddress = process.env.DLOOP_TOKEN_ADDRESS;
            if (!rpcUrl || !tokenAddress) {
                throw new Error('Missing required environment variables');
            }
            const provider = new ethers.JsonRpcProvider(rpcUrl);
            // ERC20 token ABI
            const tokenABI = [
                "function balanceOf(address owner) view returns (uint256)",
                "function decimals() view returns (uint8)"
            ];
            const tokenContract = new ethers.Contract(tokenAddress, tokenABI, provider);
            const balances = [];
            let totalBalance = 0;
            // Check balance for each node
            for (let i = 1; i <= 5; i++) {
                try {
                    const privateKey = process.env[`AI_NODE_${i}_PRIVATE_KEY`];
                    if (!privateKey)
                        continue;
                    const wallet = new ethers.Wallet(privateKey, provider);
                    const balance = await tokenContract.balanceOf(wallet.address);
                    const formattedBalance = parseFloat(ethers.formatEther(balance));
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
/**
 * Treasury Provider - Get financial context
 */
export const treasuryProvider = {
    name: "TREASURY_PROVIDER",
    description: "Provides financial context and balance information",
    get: async (runtime, message) => {
        try {
            const statusResult = await treasuryStatusAction.handler({});
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
/**
 * Main treasury plugin export
 */
export const treasuryPlugin = {
    name: "treasury-plugin",
    description: "Balance monitoring and financial tracking for DLoop governance",
    actions: [treasuryStatusAction],
    providers: [treasuryProvider]
};
export default treasuryPlugin;
//# sourceMappingURL=index.js.map