#!/usr/bin/env npx ts-node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const ethers_1 = require("ethers");
dotenv_1.default.config();
async function checkStakingRequirements() {
    try {
        console.log('Checking DLOOP token staking requirements...\n');
        const provider = new ethers_1.ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL);
        // AI Node Registry contract
        const registryAddress = '0x0045c7D99489f1d8A5900243956B0206344417DD';
        // Basic ABI for checking staking amount
        const registryABI = [
            'function nodeStakeAmount() view returns (uint256)',
            'function dloopToken() view returns (address)'
        ];
        const registryContract = new ethers_1.ethers.Contract(registryAddress, registryABI, provider);
        // Get staking requirements
        const stakeAmount = await registryContract.nodeStakeAmount();
        const dloopTokenAddress = await registryContract.dloopToken();
        console.log('Staking Requirements:');
        console.log(`Required stake amount: ${ethers_1.ethers.formatEther(stakeAmount)} DLOOP`);
        console.log(`DLOOP token address: ${dloopTokenAddress}`);
        // Check current balances for governance nodes
        console.log('\nGovernance Node Addresses:');
        const nodeAddresses = [
            '0x561529036AB886c1FD3D112360383D79fBA9E71c', // ai-gov-01
            '0x48B2353954496679CF7C73d239bc12098cB0C5B4', // ai-gov-02
            '0x43f76157E9696302E287181828cB3B0C6B89d31e', // ai-gov-03
            '0xC02764913ce2F23B094F0338a711EFD984024A46', // ai-gov-04
            '0x00FfF703fa6837A1a46b3DF9B6a047404046379E' // ai-gov-05
        ];
        // DLOOP token ABI for balance check
        const dloopABI = [
            'function balanceOf(address) view returns (uint256)',
            'function symbol() view returns (string)',
            'function decimals() view returns (uint8)'
        ];
        const dloopContract = new ethers_1.ethers.Contract(dloopTokenAddress, dloopABI, provider);
        const symbol = await dloopContract.symbol();
        const decimals = await dloopContract.decimals();
        console.log(`Token: ${symbol}, Decimals: ${decimals}`);
        console.log('\nCurrent Token Balances:');
        for (let i = 0; i < nodeAddresses.length; i++) {
            try {
                const balance = await dloopContract.balanceOf(nodeAddresses[i]);
                const formattedBalance = ethers_1.ethers.formatUnits(balance, decimals);
                const hasEnough = balance >= stakeAmount;
                console.log(`ai-gov-0${i + 1}: ${formattedBalance} ${symbol} ${hasEnough ? '✅' : '❌'}`);
            }
            catch (error) {
                console.log(`ai-gov-0${i + 1}: Balance check failed`);
            }
        }
        console.log('\nSummary:');
        console.log(`Each node needs: ${ethers_1.ethers.formatEther(stakeAmount)} DLOOP tokens`);
        console.log(`Total for 5 nodes: ${ethers_1.ethers.formatEther(stakeAmount * 5n)} DLOOP tokens`);
        console.log(`\nTo fund the nodes, send DLOOP tokens to each address above.`);
    }
    catch (error) {
        console.error('Failed to check staking requirements:', error.message);
    }
}
if (require.main === module) {
    checkStakingRequirements()
        .then(() => process.exit(0))
        .catch((error) => {
        console.error('Check failed:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=checkStakingRequirements.js.map