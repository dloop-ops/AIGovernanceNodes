"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ethers_1 = require("ethers");
async function directNodeRegistration() {
    console.log('Direct node registration with simplified approach');
    const provider = new ethers_1.ethers.JsonRpcProvider('https://sepolia.gateway.tenderly.co');
    const contractAddresses = {
        aiNodeRegistry: '0x0045c7D99489f1d8A5900243956B0206344417DD',
        dloopToken: '0x05B366778566e93abfB8e4A9B794e4ad006446b4'
    };
    const identityEndpoint = 'https://d-loop.io/identity/';
    // Simple ABI for registration
    const registryABI = [
        'function registerNode(string metadata) external',
        'function getNodeInfo(address) external view returns (tuple(address, string, bool, uint256, uint256, uint256))'
    ];
    const nodeConfigs = [
        { id: 'ai-gov-01', key: process.env.AI_NODE_1_PRIVATE_KEY, strategy: 'Conservative' },
        { id: 'ai-gov-02', key: process.env.AI_NODE_2_PRIVATE_KEY, strategy: 'Aggressive' },
        { id: 'ai-gov-03', key: process.env.AI_NODE_3_PRIVATE_KEY, strategy: 'Conservative' },
        { id: 'ai-gov-04', key: process.env.AI_NODE_4_PRIVATE_KEY, strategy: 'Aggressive' },
        { id: 'ai-gov-05', key: process.env.AI_NODE_5_PRIVATE_KEY, strategy: 'Conservative' }
    ];
    let registeredCount = 0;
    for (const nodeConfig of nodeConfigs) {
        if (!nodeConfig.key) {
            console.log(`Skipping ${nodeConfig.id} - requires authentication`);
            continue;
        }
        try {
            const wallet = new ethers_1.ethers.Wallet(nodeConfig.key, provider);
            console.log(`\nRegistering ${nodeConfig.id}`);
            console.log(`Address: ${wallet.address}`);
            // Check DLOOP allowance
            const dloopAbi = ['function allowance(address, address) external view returns (uint256)'];
            const dloopContract = new ethers_1.ethers.Contract(contractAddresses.dloopToken, dloopAbi, provider);
            const allowance = await dloopContract.allowance(wallet.address, contractAddresses.aiNodeRegistry);
            console.log(`DLOOP allowance: ${ethers_1.ethers.formatEther(allowance)}`);
            if (parseFloat(ethers_1.ethers.formatEther(allowance)) < 1.0) {
                console.log(`${nodeConfig.id} needs DLOOP approval first`);
                continue;
            }
            // Create metadata
            const metadata = JSON.stringify({
                name: `AI Governance Node ${nodeConfig.id}`,
                description: `Automated governance node using ${nodeConfig.strategy} strategy`,
                endpoint: identityEndpoint,
                nodeType: 'governance',
                strategy: nodeConfig.strategy.toLowerCase(),
                version: '2.0.0',
                registeredAt: Date.now()
            });
            console.log(`Metadata: ${metadata.substring(0, 100)}...`);
            // Register node
            const registryContract = new ethers_1.ethers.Contract(contractAddresses.aiNodeRegistry, registryABI, wallet);
            const tx = await registryContract.registerNode(metadata, {
                gasLimit: '500000',
                maxFeePerGas: ethers_1.ethers.parseUnits('25', 'gwei'),
                maxPriorityFeePerGas: ethers_1.ethers.parseUnits('2', 'gwei')
            });
            console.log(`Transaction submitted: ${tx.hash}`);
            const receipt = await tx.wait(3);
            if (receipt && receipt.status === 1) {
                console.log(`✓ ${nodeConfig.id} registered successfully`);
                console.log(`Gas used: ${receipt.gasUsed.toString()}`);
                registeredCount++;
            }
            else {
                console.log(`✗ ${nodeConfig.id} registration failed`);
            }
        }
        catch (error) {
            console.log(`Error registering ${nodeConfig.id}: ${error.message}`);
            if (error.message.includes('NodeAlreadyRegistered')) {
                console.log(`${nodeConfig.id} already registered`);
                registeredCount++;
            }
        }
        // Wait between registrations
        await new Promise(resolve => setTimeout(resolve, 3000));
    }
    console.log(`\nRegistration complete: ${registeredCount}/5 nodes`);
}
directNodeRegistration()
    .then(() => {
    console.log('Direct registration completed');
    process.exit(0);
})
    .catch((error) => {
    console.error('Registration process failed:', error.message);
    process.exit(1);
});
//# sourceMappingURL=directNodeRegistration.js.map