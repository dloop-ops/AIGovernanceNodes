#!/usr/bin/env npx ts-node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const WalletService_1 = require("./src/services/WalletService");
const ContractService_1 = require("./src/services/ContractService");
const ethers_1 = require("ethers");
dotenv_1.default.config();
async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
async function retryWithBackoff(operation, maxRetries = 5, baseDelay = 2000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        }
        catch (error) {
            console.log(`Attempt ${attempt}/${maxRetries} failed:`, error.message);
            if (attempt === maxRetries) {
                throw error;
            }
            const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
            console.log(`Waiting ${Math.round(delay)}ms before retry...`);
            await sleep(delay);
        }
    }
    throw new Error('Max retries exceeded');
}
async function registerGovernanceNodes() {
    try {
        console.log('Initializing node registration system...\n');
        // Initialize services
        const walletService = new WalletService_1.WalletService();
        const contractService = new ContractService_1.ContractService(walletService);
        const nodes = [
            {
                nodeId: 'ai-gov-01',
                address: '0x561529036AB886c1FD3D112360383D79fBA9E71c',
                name: 'AI Governance Node ai-gov-01',
                endpoint: 'https://governance-node-ai-gov-01.example.com'
            },
            {
                nodeId: 'ai-gov-02',
                address: '0x48B2353954496679CF7C73d239bc12098cB0C5B4',
                name: 'AI Governance Node ai-gov-02',
                endpoint: 'https://governance-node-ai-gov-02.example.com'
            },
            {
                nodeId: 'ai-gov-03',
                address: '0x43f76157E9696302E287181828cB3B0C6B89d31e',
                name: 'AI Governance Node ai-gov-03',
                endpoint: 'https://governance-node-ai-gov-03.example.com'
            },
            {
                nodeId: 'ai-gov-04',
                address: '0xC02764913ce2F23B094F0338a711EFD984024A46',
                name: 'AI Governance Node ai-gov-04',
                endpoint: 'https://governance-node-ai-gov-04.example.com'
            },
            {
                nodeId: 'ai-gov-05',
                address: '0x00FfF703fa6837A1a46b3DF9B6a047404046379E',
                name: 'AI Governance Node ai-gov-05',
                endpoint: 'https://governance-node-ai-gov-05.example.com'
            }
        ];
        console.log('Step 1: Checking current registration status...');
        const registrationStatus = [];
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            try {
                const isActive = await retryWithBackoff(async () => {
                    return await contractService.isNodeActive(node.address);
                });
                registrationStatus.push({
                    nodeId: node.nodeId,
                    address: node.address,
                    isRegistered: isActive
                });
                console.log(`${node.nodeId}: ${isActive ? 'REGISTERED' : 'NOT REGISTERED'}`);
                await sleep(1000); // Rate limiting protection
            }
            catch (error) {
                console.log(`${node.nodeId}: STATUS CHECK FAILED - ${error.message}`);
                registrationStatus.push({
                    nodeId: node.nodeId,
                    address: node.address,
                    isRegistered: false
                });
            }
        }
        const unregisteredNodes = registrationStatus.filter(n => !n.isRegistered);
        console.log(`\nFound ${unregisteredNodes.length} unregistered nodes`);
        if (unregisteredNodes.length === 0) {
            console.log('All nodes are already registered!');
            return;
        }
        console.log('\nStep 2: Attempting to register unregistered nodes...');
        for (const nodeStatus of unregisteredNodes) {
            const nodeIndex = nodes.findIndex(n => n.nodeId === nodeStatus.nodeId);
            const node = nodes[nodeIndex];
            console.log(`\nRegistering ${node.nodeId}...`);
            try {
                // Check if node has sufficient DLOOP tokens for staking
                let tokenBalance;
                try {
                    tokenBalance = await retryWithBackoff(async () => {
                        return await contractService.getTokenBalance(nodeIndex);
                    });
                    console.log(`Token balance: ${ethers_1.ethers.formatEther(tokenBalance)} DLOOP`);
                }
                catch (error) {
                    console.log('Token balance check failed, proceeding with registration...');
                    tokenBalance = '0';
                }
                // Try registration
                const result = await contractService.registerAINode(nodeIndex);
                console.log(`Registration transaction: ${result}`);
                // Wait for transaction confirmation with retry
                await retryWithBackoff(async () => {
                    await sleep(5000); // Wait for block confirmation
                    const isActive = await contractService.isNodeActive(node.address);
                    if (!isActive) {
                        throw new Error('Registration not yet confirmed');
                    }
                    return isActive;
                }, 5, 3000);
                console.log(`✅ ${node.nodeId} registered successfully`);
            }
            catch (error) {
                console.log(`❌ Failed to register ${node.nodeId}: ${error.message}`);
                // Check if it's a balance issue
                if (error.message.includes('insufficient') || error.message.includes('balance')) {
                    console.log(`  Issue: Insufficient DLOOP tokens for staking`);
                }
                else if (error.message.includes('Too Many Requests')) {
                    console.log(`  Issue: RPC rate limiting - will retry later`);
                }
                else {
                    console.log(`  Issue: ${error.message}`);
                }
            }
            // Rate limiting protection between registrations
            await sleep(2000);
        }
        console.log('\nStep 3: Final registration verification...');
        for (const node of nodes) {
            try {
                const isActive = await retryWithBackoff(async () => {
                    return await contractService.isNodeActive(node.address);
                });
                console.log(`${node.nodeId}: ${isActive ? '✅ REGISTERED' : '❌ NOT REGISTERED'}`);
                await sleep(1000);
            }
            catch (error) {
                console.log(`${node.nodeId}: ❌ VERIFICATION FAILED`);
            }
        }
        console.log('\nNode registration process completed.');
    }
    catch (error) {
        console.error('Registration process failed:', error);
        process.exit(1);
    }
}
if (require.main === module) {
    registerGovernanceNodes()
        .then(() => {
        console.log('\nGovernance node registration completed.');
        process.exit(0);
    })
        .catch((error) => {
        console.error('Registration failed:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=retryNodeRegistration.js.map