"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ethers_1 = require("ethers");
async function executeNodeRegistration() {
    console.log('Executing Direct Node Registration');
    const provider = new ethers_1.ethers.JsonRpcProvider('https://sepolia.gateway.tenderly.co');
    const contractAddresses = {
        aiNodeRegistry: '0x0045c7D99489f1d8A5900243956B0206344417DD',
        dloopToken: '0x05B366778566e93abfB8e4A9B794e4ad006446b4'
    };
    const identityEndpoint = 'https://d-loop.io/identity/identity.json';
    const registryABI = [
        'function registerNode(string metadata) external',
        'function getNodeInfo(address) external view returns (tuple(address, string, bool, uint256, uint256, uint256))',
        'function isNodeActive(address) external view returns (bool)'
    ];
    const nodeConfigs = [
        { id: 'ai-gov-01', key: process.env.AI_NODE_1_PRIVATE_KEY },
        { id: 'ai-gov-02', key: process.env.AI_NODE_2_PRIVATE_KEY },
        { id: 'ai-gov-03', key: process.env.AI_NODE_3_PRIVATE_KEY },
        { id: 'ai-gov-04', key: process.env.AI_NODE_4_PRIVATE_KEY },
        { id: 'ai-gov-05', key: process.env.AI_NODE_5_PRIVATE_KEY }
    ];
    let registeredCount = 0;
    for (const nodeConfig of nodeConfigs) {
        if (!nodeConfig.key) {
            console.log(`${nodeConfig.id}: Authentication required`);
            continue;
        }
        try {
            const wallet = new ethers_1.ethers.Wallet(nodeConfig.key, provider);
            console.log(`\nProcessing ${nodeConfig.id} (${wallet.address})`);
            // Check prerequisites quickly
            const dloopAbi = ['function allowance(address, address) external view returns (uint256)'];
            const dloopContract = new ethers_1.ethers.Contract(contractAddresses.dloopToken, dloopAbi, provider);
            const allowance = await dloopContract.allowance(wallet.address, contractAddresses.aiNodeRegistry);
            if (parseFloat(ethers_1.ethers.formatEther(allowance)) < 1.0) {
                console.log(`${nodeConfig.id}: Insufficient allowance`);
                continue;
            }
            // Check if already registered
            const registryContract = new ethers_1.ethers.Contract(contractAddresses.aiNodeRegistry, registryABI, provider);
            try {
                const nodeInfo = await registryContract.getNodeInfo(wallet.address);
                console.log(`${nodeConfig.id}: Already registered`);
                registeredCount++;
                continue;
            }
            catch (error) {
                if (!error.message.includes('NodeNotRegistered')) {
                    console.log(`${nodeConfig.id}: Check failed - ${error.message.substring(0, 50)}`);
                    continue;
                }
            }
            // Attempt registration
            const metadata = JSON.stringify({
                name: `AI Governance Node ${nodeConfig.id}`,
                description: `Automated governance node`,
                endpoint: identityEndpoint,
                nodeType: 'governance',
                version: '2.0.0'
            });
            console.log(`Attempting registration...`);
            const registryWithWallet = new ethers_1.ethers.Contract(contractAddresses.aiNodeRegistry, registryABI, wallet);
            const tx = await registryWithWallet.registerNode(metadata, {
                gasLimit: '500000',
                maxFeePerGas: ethers_1.ethers.parseUnits('20', 'gwei'),
                maxPriorityFeePerGas: ethers_1.ethers.parseUnits('2', 'gwei')
            });
            console.log(`Transaction: ${tx.hash}`);
            const receipt = await tx.wait(2);
            if (receipt && receipt.status === 1) {
                console.log(`✓ ${nodeConfig.id} registered successfully`);
                registeredCount++;
            }
            else {
                console.log(`✗ ${nodeConfig.id} registration failed`);
            }
        }
        catch (error) {
            console.log(`${nodeConfig.id}: Error - ${error.message.substring(0, 100)}`);
            if (error.message.includes('NodeAlreadyRegistered')) {
                console.log(`${nodeConfig.id}: Already registered`);
                registeredCount++;
            }
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    console.log(`\nRegistration Summary: ${registeredCount}/5 nodes completed`);
    console.log(`Identity endpoint: ${identityEndpoint}`);
}
executeNodeRegistration()
    .then(() => {
    console.log('Node registration execution completed');
    process.exit(0);
})
    .catch((error) => {
    console.error('Registration execution failed:', error.message);
    process.exit(1);
});
//# sourceMappingURL=executeNodeRegistration.js.map