"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ethers_1 = require("ethers");
class RobustProvider {
    constructor() {
        this.currentIndex = 0;
        this.providers = [
            new ethers_1.ethers.JsonRpcProvider('https://sepolia.gateway.tenderly.co'),
            new ethers_1.ethers.JsonRpcProvider(`https://sepolia.infura.io/v3/${process.env.ETHEREUM_RPC_URL?.split('/').pop()}`),
            new ethers_1.ethers.JsonRpcProvider(`https://sepolia.infura.io/v3/${process.env.BACKUP_INFURA_KEY}`),
            new ethers_1.ethers.JsonRpcProvider('https://ethereum-sepolia-rpc.publicnode.com')
        ];
    }
    async getProvider() {
        for (let i = 0; i < this.providers.length; i++) {
            try {
                const provider = this.providers[(this.currentIndex + i) % this.providers.length];
                await provider.getBlockNumber();
                this.currentIndex = (this.currentIndex + i) % this.providers.length;
                return provider;
            }
            catch (error) {
                continue;
            }
        }
        throw new Error('All RPC providers are unavailable');
    }
    rotateProvider() {
        this.currentIndex = (this.currentIndex + 1) % this.providers.length;
    }
}
async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
async function retryWithProviderRotation(operation, maxAttempts = 3) {
    const robustProvider = new RobustProvider();
    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const provider = await robustProvider.getProvider();
            return await operation(provider);
        }
        catch (error) {
            lastError = error;
            console.log(`Attempt ${attempt} failed: ${error.message.substring(0, 80)}...`);
            if (attempt < maxAttempts) {
                robustProvider.rotateProvider();
                await sleep(1000 * attempt);
            }
        }
    }
    throw lastError;
}
async function registerNodeDirect(nodeIndex, provider) {
    const privateKeys = [
        process.env.AI_NODE_1_PRIVATE_KEY,
        process.env.AI_NODE_2_PRIVATE_KEY,
        process.env.AI_NODE_3_PRIVATE_KEY,
        process.env.AI_NODE_4_PRIVATE_KEY,
        process.env.AI_NODE_5_PRIVATE_KEY
    ];
    const nodeIds = ['ai-gov-01', 'ai-gov-02', 'ai-gov-03', 'ai-gov-04', 'ai-gov-05'];
    const strategies = ['conservative', 'aggressive', 'conservative', 'aggressive', 'conservative'];
    if (!privateKeys[nodeIndex]) {
        throw new Error(`Private key not found for node ${nodeIndex}`);
    }
    const wallet = new ethers_1.ethers.Wallet(privateKeys[nodeIndex], provider);
    // Load ABI and create minimal contract interface
    const registryAddress = '0x0045c7D99489f1d8A5900243956B0206344417DD';
    const dloopAddress = '0x05B366778566e93abfB8e4A9B794e4ad006446b4';
    // Simplified ABI with only required methods
    const registryAbi = [
        'function registerNode(string metadata) external',
        'function getNodeInfo(address nodeAddress) external view returns (tuple(address nodeAddress, string metadata, bool isActive, uint256 stakedAmount, uint256 reputation, uint256 lastActivity))',
        'function nodeExists(address nodeAddress) external view returns (bool)'
    ];
    const tokenAbi = [
        'function approve(address spender, uint256 amount) external returns (bool)',
        'function allowance(address owner, address spender) external view returns (uint256)',
        'function balanceOf(address account) external view returns (uint256)'
    ];
    const registry = new ethers_1.ethers.Contract(registryAddress, registryAbi, wallet);
    const token = new ethers_1.ethers.Contract(dloopAddress, tokenAbi, wallet);
    console.log(`Processing node ${nodeIds[nodeIndex]} (${wallet.address})`);
    // Check if already registered using nodeExists method
    try {
        const exists = await registry.nodeExists(wallet.address);
        if (exists) {
            console.log(`Node ${nodeIds[nodeIndex]} already registered`);
            return 'already_registered';
        }
    }
    catch (error) {
        // If nodeExists doesn't work, try getNodeInfo
        try {
            await registry.getNodeInfo(wallet.address);
            console.log(`Node ${nodeIds[nodeIndex]} already registered`);
            return 'already_registered';
        }
        catch (getInfoError) {
            if (!getInfoError.message.includes('NodeNotRegistered')) {
                throw getInfoError;
            }
        }
    }
    // Ensure token approval
    const requiredStake = ethers_1.ethers.parseEther('1.0');
    const currentAllowance = await token.allowance(wallet.address, registryAddress);
    if (currentAllowance < requiredStake) {
        console.log(`Approving tokens for ${nodeIds[nodeIndex]}`);
        const approveTx = await token.approve(registryAddress, requiredStake, {
            gasLimit: '60000'
        });
        await approveTx.wait(1);
        await sleep(2000);
    }
    // Create registration metadata
    const metadata = JSON.stringify({
        name: `AI Governance Node ${nodeIds[nodeIndex]}`,
        description: `Automated governance node using ${strategies[nodeIndex]} strategy`,
        endpoint: `https://governance-node-${nodeIds[nodeIndex]}.d-loop.io`,
        nodeType: 'governance',
        strategy: strategies[nodeIndex],
        version: '1.0.0',
        registeredAt: Date.now()
    });
    console.log(`Attempting registration for ${nodeIds[nodeIndex]}`);
    // Try registration with conservative gas settings
    const registrationTx = await registry.registerNode(metadata, {
        gasLimit: '300000'
    });
    const receipt = await registrationTx.wait(1);
    if (receipt.status === 1) {
        console.log(`Successfully registered ${nodeIds[nodeIndex]}`);
        console.log(`Transaction hash: ${registrationTx.hash}`);
        console.log(`Gas used: ${receipt.gasUsed.toString()}`);
        return registrationTx.hash;
    }
    else {
        throw new Error(`Registration transaction failed for ${nodeIds[nodeIndex]}`);
    }
}
async function robustNodeRegistration() {
    console.log('Starting robust node registration with simplified contract calls');
    let successCount = 0;
    let alreadyRegisteredCount = 0;
    let failureCount = 0;
    for (let nodeIndex = 0; nodeIndex < 5; nodeIndex++) {
        try {
            console.log(`\n--- Processing Node ${nodeIndex + 1}/5 ---`);
            const result = await retryWithProviderRotation((provider) => registerNodeDirect(nodeIndex, provider), 3);
            if (result === 'already_registered') {
                alreadyRegisteredCount++;
            }
            else {
                successCount++;
            }
            await sleep(2000); // Pause between registrations
        }
        catch (error) {
            console.log(`Failed to register node ${nodeIndex}: ${error.message}`);
            failureCount++;
        }
    }
    console.log('\n=== REGISTRATION RESULTS ===');
    console.log(`Newly registered: ${successCount}`);
    console.log(`Already registered: ${alreadyRegisteredCount}`);
    console.log(`Failed: ${failureCount}`);
    console.log(`Total operational: ${successCount + alreadyRegisteredCount}/5`);
    const totalOperational = successCount + alreadyRegisteredCount;
    if (totalOperational >= 4) {
        console.log('\nGovernance system is fully operational!');
    }
    else if (totalOperational >= 3) {
        console.log('\nMinimum governance quorum achieved.');
    }
    else {
        console.log('\nAdditional registration attempts may be needed.');
    }
}
robustNodeRegistration()
    .then(() => {
    console.log('Robust registration process completed');
    process.exit(0);
})
    .catch((error) => {
    console.error('Registration process failed:', error.message);
    process.exit(1);
});
//# sourceMappingURL=robustNodeRegistration.js.map