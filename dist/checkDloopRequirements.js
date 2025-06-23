#!/usr/bin/env npx ts-node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const ethers_1 = require("ethers");
dotenv_1.default.config();
async function checkDloopRequirements() {
    try {
        console.log('Checking DLOOP token requirements and balances...\n');
        const provider = new ethers_1.ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL);
        // Contract addresses
        const dloopTokenAddress = '0x05B366778566e93abfB8e4A9B794e4ad006446b4';
        const aiNodeRegistryAddress = '0x0045c7D99489f1d8A5900243956B0206344417DD';
        // DLOOP token contract
        const dloopABI = [
            'function balanceOf(address) view returns (uint256)',
            'function symbol() view returns (string)',
            'function decimals() view returns (uint8)',
            'function totalSupply() view returns (uint256)'
        ];
        // AI Node Registry contract
        const registryABI = [
            'function nodeStakeAmount() view returns (uint256)'
        ];
        const dloopContract = new ethers_1.ethers.Contract(dloopTokenAddress, dloopABI, provider);
        const registryContract = new ethers_1.ethers.Contract(aiNodeRegistryAddress, registryABI, provider);
        // Get token info
        const symbol = await dloopContract.symbol();
        const decimals = await dloopContract.decimals();
        const totalSupply = await dloopContract.totalSupply();
        console.log(`Token: ${symbol}`);
        console.log(`Decimals: ${decimals}`);
        console.log(`Total Supply: ${ethers_1.ethers.formatUnits(totalSupply, decimals)} ${symbol}`);
        // Get staking requirement
        const stakeAmount = await registryContract.nodeStakeAmount();
        console.log(`Required stake per node: ${ethers_1.ethers.formatUnits(stakeAmount, decimals)} ${symbol}`);
        console.log(`Total for 5 nodes: ${ethers_1.ethers.formatUnits(stakeAmount * 5n, decimals)} ${symbol}\n`);
        // Governance node addresses
        const nodeAddresses = [
            { id: 'ai-gov-01', address: '0x561529036AB886c1FD3D112360383D79fBA9E71c' },
            { id: 'ai-gov-02', address: '0x48B2353954496679CF7C73d239bc12098cB0C5B4' },
            { id: 'ai-gov-03', address: '0x43f76157E9696302E287181828cB3B0C6B89d31e' },
            { id: 'ai-gov-04', address: '0xC02764913ce2F23B094F0338a711EFD984024A46' },
            { id: 'ai-gov-05', address: '0x00FfF703fa6837A1a46b3DF9B6a047404046379E' }
        ];
        console.log('Current DLOOP balances:');
        let totalBalance = 0n;
        let nodesWithSufficientBalance = 0;
        for (const node of nodeAddresses) {
            try {
                const balance = await dloopContract.balanceOf(node.address);
                const formattedBalance = ethers_1.ethers.formatUnits(balance, decimals);
                const hasEnough = balance >= stakeAmount;
                if (hasEnough)
                    nodesWithSufficientBalance++;
                totalBalance += balance;
                console.log(`${node.id}: ${formattedBalance} ${symbol} ${hasEnough ? '✅' : '❌'}`);
            }
            catch (error) {
                console.log(`${node.id}: Balance check failed`);
            }
        }
        console.log(`\nTotal balance across all nodes: ${ethers_1.ethers.formatUnits(totalBalance, decimals)} ${symbol}`);
        console.log(`Nodes ready for registration: ${nodesWithSufficientBalance}/5`);
        if (nodesWithSufficientBalance < 5) {
            const deficit = (stakeAmount * 5n) - totalBalance;
            console.log(`Additional ${symbol} needed: ${ethers_1.ethers.formatUnits(deficit, decimals)}`);
            console.log('\nTo complete node registration:');
            console.log(`1. Transfer ${ethers_1.ethers.formatUnits(stakeAmount, decimals)} ${symbol} to each node address`);
            console.log(`2. Contract address: ${dloopTokenAddress}`);
            console.log(`3. Network: Sepolia Testnet`);
        }
        else {
            console.log('\nAll nodes have sufficient DLOOP tokens for registration!');
        }
    }
    catch (error) {
        console.error('Failed to check DLOOP requirements:', error.message);
    }
}
if (require.main === module) {
    checkDloopRequirements()
        .then(() => process.exit(0))
        .catch((error) => {
        console.error('Check failed:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=checkDloopRequirements.js.map