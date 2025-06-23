"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ethers_1 = require("ethers");
async function finalIdentityEndpointRegistration() {
    console.log('Final registration with correct identity.json endpoint');
    const provider = new ethers_1.ethers.JsonRpcProvider('https://sepolia.gateway.tenderly.co');
    const contractAddresses = {
        aiNodeRegistry: '0x0045c7D99489f1d8A5900243956B0206344417DD',
        dloopToken: '0x05B366778566e93abfB8e4A9B794e4ad006446b4'
    };
    // Correct identity endpoint with JSON specification
    const identityEndpoint = 'https://d-loop.io/identity/identity.json';
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
    let successCount = 0;
    let alreadyRegisteredCount = 0;
    console.log(`Using corrected endpoint: ${identityEndpoint}`);
    for (const nodeConfig of nodeConfigs) {
        if (!nodeConfig.key) {
            console.log(`Skipping ${nodeConfig.id} - authentication required`);
            continue;
        }
        try {
            const wallet = new ethers_1.ethers.Wallet(nodeConfig.key, provider);
            console.log(`\nProcessing ${nodeConfig.id}`);
            console.log(`Address: ${wallet.address}`);
            // Check DLOOP allowance
            const dloopAbi = ['function allowance(address, address) external view returns (uint256)'];
            const dloopContract = new ethers_1.ethers.Contract(contractAddresses.dloopToken, dloopAbi, provider);
            const allowance = await dloopContract.allowance(wallet.address, contractAddresses.aiNodeRegistry);
            console.log(`DLOOP allowance: ${ethers_1.ethers.formatEther(allowance)}`);
            if (parseFloat(ethers_1.ethers.formatEther(allowance)) < 1.0) {
                console.log(`${nodeConfig.id} insufficient DLOOP allowance`);
                continue;
            }
            // Check if already registered
            const registryContract = new ethers_1.ethers.Contract(contractAddresses.aiNodeRegistry, registryABI, provider);
            try {
                const nodeInfo = await registryContract.getNodeInfo(wallet.address);
                const metadata = JSON.parse(nodeInfo[1]);
                console.log(`${nodeConfig.id} already registered with endpoint: ${metadata.endpoint}`);
                if (metadata.endpoint === identityEndpoint) {
                    console.log('Endpoint is correct');
                    alreadyRegisteredCount++;
                }
                else {
                    console.log('Endpoint needs updating to identity.json format');
                }
                continue;
            }
            catch (error) {
                if (!error.message.includes('NodeNotRegistered')) {
                    console.log(`Error checking ${nodeConfig.id}: ${error.message}`);
                    continue;
                }
                console.log('Node not registered - proceeding with registration');
            }
            // Create metadata with correct identity.json endpoint
            const metadata = JSON.stringify({
                name: `AI Governance Node ${nodeConfig.id}`,
                description: `Automated governance node using ${nodeConfig.strategy} strategy`,
                endpoint: identityEndpoint,
                nodeType: 'governance',
                strategy: nodeConfig.strategy.toLowerCase(),
                version: '2.0.0',
                registeredAt: Date.now()
            });
            console.log(`Registering with identity.json endpoint...`);
            const registryWithWallet = new ethers_1.ethers.Contract(contractAddresses.aiNodeRegistry, registryABI, wallet);
            const tx = await registryWithWallet.registerNode(metadata, {
                gasLimit: '450000',
                maxFeePerGas: ethers_1.ethers.parseUnits('30', 'gwei'),
                maxPriorityFeePerGas: ethers_1.ethers.parseUnits('3', 'gwei')
            });
            console.log(`Transaction: ${tx.hash}`);
            const receipt = await tx.wait(3);
            if (receipt && receipt.status === 1) {
                console.log(`✓ ${nodeConfig.id} registered successfully`);
                console.log(`Gas used: ${receipt.gasUsed.toString()}`);
                successCount++;
                // Verify registration with correct endpoint
                await new Promise(resolve => setTimeout(resolve, 3000));
                try {
                    const verifiedInfo = await registryContract.getNodeInfo(wallet.address);
                    const verifiedMetadata = JSON.parse(verifiedInfo[1]);
                    console.log(`Verified endpoint: ${verifiedMetadata.endpoint}`);
                    if (verifiedMetadata.endpoint === identityEndpoint) {
                        console.log('✓ Endpoint verification successful');
                    }
                }
                catch (verifyError) {
                    console.log('Registration completed - verification pending');
                }
            }
            else {
                console.log(`✗ ${nodeConfig.id} registration failed`);
            }
        }
        catch (error) {
            console.log(`Error with ${nodeConfig.id}: ${error.message}`);
            if (error.message.includes('NodeAlreadyRegistered')) {
                console.log(`${nodeConfig.id} was registered during process`);
                alreadyRegisteredCount++;
            }
        }
        await new Promise(resolve => setTimeout(resolve, 3000));
    }
    console.log('\n=== Final Registration Summary ===');
    console.log(`Successfully registered: ${successCount}`);
    console.log(`Already registered: ${alreadyRegisteredCount}`);
    console.log(`Total nodes with correct endpoint: ${successCount + alreadyRegisteredCount}`);
    console.log(`Correct endpoint: ${identityEndpoint}`);
    if (successCount + alreadyRegisteredCount === 5) {
        console.log('✓ All governance nodes registered with identity.json endpoint');
    }
}
finalIdentityEndpointRegistration()
    .then(() => {
    console.log('Final identity endpoint registration completed');
    process.exit(0);
})
    .catch((error) => {
    console.error('Registration failed:', error.message);
    process.exit(1);
});
//# sourceMappingURL=finalIdentityEndpointRegistration.js.map