"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ethers_1 = require("ethers");
async function enhancedRegistrationSystem() {
    console.log('Enhanced Registration System with Gas Optimization');
    const provider = new ethers_1.ethers.JsonRpcProvider('https://sepolia.gateway.tenderly.co');
    const contractAddresses = {
        aiNodeRegistry: '0x0045c7D99489f1d8A5900243956B0206344417DD',
        dloopToken: '0x05B366778566e93abfB8e4A9B794e4ad006446b4',
        soulboundNft: '0x6391C14631b2Be5374297fA3110687b80233104c'
    };
    const identityEndpoint = 'https://d-loop.io/identity/identity.json';
    // Comprehensive ABI with multiple registration strategies
    const registryABI = [
        'function registerNode(string metadata) external',
        'function registerNodeWithStaking(address nodeAddress, string metadata, uint256 requirementId) external',
        'function getNodeInfo(address) external view returns (tuple(address, string, bool, uint256, uint256, uint256))',
        'function isNodeActive(address) external view returns (bool)',
        'function getRequiredStake() external view returns (uint256)'
    ];
    const nodeConfigs = [
        { id: 'ai-gov-01', key: process.env.AI_NODE_1_PRIVATE_KEY, strategy: 'Conservative' },
        { id: 'ai-gov-02', key: process.env.AI_NODE_2_PRIVATE_KEY, strategy: 'Aggressive' },
        { id: 'ai-gov-03', key: process.env.AI_NODE_3_PRIVATE_KEY, strategy: 'Conservative' },
        { id: 'ai-gov-04', key: process.env.AI_NODE_4_PRIVATE_KEY, strategy: 'Aggressive' },
        { id: 'ai-gov-05', key: process.env.AI_NODE_5_PRIVATE_KEY, strategy: 'Conservative' }
    ];
    let successfulRegistrations = 0;
    for (const nodeConfig of nodeConfigs) {
        if (!nodeConfig.key) {
            console.log(`Skipping ${nodeConfig.id} - authentication required`);
            continue;
        }
        try {
            const wallet = new ethers_1.ethers.Wallet(nodeConfig.key, provider);
            console.log(`\nProcessing ${nodeConfig.id}`);
            console.log(`Address: ${wallet.address}`);
            // Verify prerequisites
            const dloopAbi = ['function allowance(address, address) external view returns (uint256)'];
            const dloopContract = new ethers_1.ethers.Contract(contractAddresses.dloopToken, dloopAbi, provider);
            const allowance = await dloopContract.allowance(wallet.address, contractAddresses.aiNodeRegistry);
            console.log(`DLOOP allowance: ${ethers_1.ethers.formatEther(allowance)}`);
            if (parseFloat(ethers_1.ethers.formatEther(allowance)) < 1.0) {
                console.log(`${nodeConfig.id} insufficient allowance - skipping`);
                continue;
            }
            // Create optimized metadata
            const metadata = JSON.stringify({
                name: `AI Governance Node ${nodeConfig.id}`,
                description: `Automated governance node using ${nodeConfig.strategy} strategy`,
                endpoint: identityEndpoint,
                nodeType: 'governance',
                strategy: nodeConfig.strategy.toLowerCase(),
                version: '2.0.0',
                registeredAt: Date.now()
            });
            console.log(`Metadata ready (${metadata.length} chars)`);
            // Enhanced registration with multiple strategies
            const registryContract = new ethers_1.ethers.Contract(contractAddresses.aiNodeRegistry, registryABI, wallet);
            // Strategy 1: Standard registerNode
            try {
                console.log('Attempting standard registration...');
                const gasEstimate = await registryContract.registerNode.estimateGas(metadata);
                console.log(`Gas estimate: ${gasEstimate.toString()}`);
                const tx = await registryContract.registerNode(metadata, {
                    gasLimit: (gasEstimate * 150n) / 100n, // 50% buffer
                    maxFeePerGas: ethers_1.ethers.parseUnits('15', 'gwei'),
                    maxPriorityFeePerGas: ethers_1.ethers.parseUnits('2', 'gwei')
                });
                console.log(`Transaction submitted: ${tx.hash}`);
                const receipt = await tx.wait(3);
                if (receipt && receipt.status === 1) {
                    console.log(`✓ ${nodeConfig.id} registered successfully`);
                    console.log(`Gas used: ${receipt.gasUsed.toString()}`);
                    successfulRegistrations++;
                    // Verify registration
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    try {
                        const nodeInfo = await registryContract.getNodeInfo(wallet.address);
                        const parsedMetadata = JSON.parse(nodeInfo[1]);
                        console.log(`Verified endpoint: ${parsedMetadata.endpoint}`);
                    }
                    catch (verifyError) {
                        console.log('Registration completed - verification pending');
                    }
                    continue;
                }
            }
            catch (standardError) {
                console.log(`Standard registration failed: ${standardError.message}`);
                if (standardError.message.includes('NodeAlreadyRegistered')) {
                    console.log(`${nodeConfig.id} already registered`);
                    successfulRegistrations++;
                    continue;
                }
                // Strategy 2: Try registerNodeWithStaking
                try {
                    console.log('Attempting staking registration...');
                    const stakingTx = await registryContract.registerNodeWithStaking(wallet.address, metadata, 0, // Default requirement ID
                    {
                        gasLimit: '600000',
                        maxFeePerGas: ethers_1.ethers.parseUnits('20', 'gwei'),
                        maxPriorityFeePerGas: ethers_1.ethers.parseUnits('3', 'gwei')
                    });
                    console.log(`Staking transaction: ${stakingTx.hash}`);
                    const stakingReceipt = await stakingTx.wait(3);
                    if (stakingReceipt && stakingReceipt.status === 1) {
                        console.log(`✓ ${nodeConfig.id} registered with staking`);
                        successfulRegistrations++;
                        continue;
                    }
                }
                catch (stakingError) {
                    console.log(`Staking registration failed: ${stakingError.message}`);
                    // Strategy 3: Manual transaction construction
                    try {
                        console.log('Attempting manual transaction...');
                        const iface = new ethers_1.ethers.Interface(registryABI);
                        const data = iface.encodeFunctionData('registerNode', [metadata]);
                        const txRequest = {
                            to: contractAddresses.aiNodeRegistry,
                            data: data,
                            gasLimit: '500000',
                            maxFeePerGas: ethers_1.ethers.parseUnits('25', 'gwei'),
                            maxPriorityFeePerGas: ethers_1.ethers.parseUnits('3', 'gwei')
                        };
                        const manualTx = await wallet.sendTransaction(txRequest);
                        console.log(`Manual transaction: ${manualTx.hash}`);
                        const manualReceipt = await manualTx.wait(3);
                        if (manualReceipt && manualReceipt.status === 1) {
                            console.log(`✓ ${nodeConfig.id} registered manually`);
                            successfulRegistrations++;
                        }
                        else {
                            console.log(`✗ ${nodeConfig.id} manual registration failed`);
                        }
                    }
                    catch (manualError) {
                        console.log(`Manual registration failed: ${manualError.message}`);
                    }
                }
            }
        }
        catch (error) {
            console.log(`Error processing ${nodeConfig.id}: ${error.message}`);
        }
        // Delay between nodes
        await new Promise(resolve => setTimeout(resolve, 3000));
    }
    console.log(`\n=== Registration Summary ===`);
    console.log(`Successful registrations: ${successfulRegistrations}/5`);
    console.log(`Identity endpoint: ${identityEndpoint}`);
    if (successfulRegistrations === 5) {
        console.log('All governance nodes successfully registered');
    }
    else {
        console.log(`${5 - successfulRegistrations} nodes require further assistance`);
    }
}
enhancedRegistrationSystem()
    .then(() => {
    console.log('Enhanced registration system completed');
    process.exit(0);
})
    .catch((error) => {
    console.error('Enhanced registration failed:', error.message);
    process.exit(1);
});
//# sourceMappingURL=enhancedRegistrationSystem.js.map