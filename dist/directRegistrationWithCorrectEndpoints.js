"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ethers_1 = require("ethers");
async function directRegistrationWithCorrectEndpoints() {
    console.log('Direct registration using correct d-loop.io identity endpoints');
    // Identity configuration endpoint (validated)
    const identityEndpoint = 'https://d-loop.io/identity/';
    const provider = new ethers_1.ethers.JsonRpcProvider('https://sepolia.gateway.tenderly.co');
    const contractAddresses = {
        aiNodeRegistry: '0x0045c7D99489f1d8A5900243956B0206344417DD',
        dloopToken: '0x05B366778566e93abfB8e4A9B794e4ad006446b4',
        soulboundNft: '0x6391C14631b2Be5374297fA3110687b80233104c'
    };
    // All 5 governance nodes with corrected endpoint
    const nodeConfigs = [
        { index: 0, id: 'ai-gov-01', key: process.env.AI_NODE_1_PRIVATE_KEY, strategy: 'Conservative' },
        { index: 1, id: 'ai-gov-02', key: process.env.AI_NODE_2_PRIVATE_KEY, strategy: 'Aggressive' },
        { index: 2, id: 'ai-gov-03', key: process.env.AI_NODE_3_PRIVATE_KEY, strategy: 'Conservative' },
        { index: 3, id: 'ai-gov-04', key: process.env.AI_NODE_4_PRIVATE_KEY, strategy: 'Aggressive' },
        { index: 4, id: 'ai-gov-05', key: process.env.AI_NODE_5_PRIVATE_KEY, strategy: 'Conservative' }
    ];
    const registryAbi = ['function registerNode(string metadata) external'];
    const dloopAbi = ['function allowance(address, address) external view returns (uint256)'];
    const balanceAbi = ['function balanceOf(address) external view returns (uint256)'];
    console.log('Processing all nodes with correct identity endpoint...');
    for (const nodeConfig of nodeConfigs) {
        if (!nodeConfig.key) {
            console.log(`Skipping ${nodeConfig.id} - no private key`);
            continue;
        }
        try {
            const wallet = new ethers_1.ethers.Wallet(nodeConfig.key, provider);
            console.log(`\nProcessing ${nodeConfig.id}`);
            console.log(`Address: ${wallet.address}`);
            // Check DLOOP allowance
            const dloopContract = new ethers_1.ethers.Contract(contractAddresses.dloopToken, dloopAbi, provider);
            const currentAllowance = await dloopContract.allowance(wallet.address, contractAddresses.aiNodeRegistry);
            console.log(`DLOOP allowance: ${ethers_1.ethers.formatEther(currentAllowance)}`);
            // Check SoulBound NFT balance
            const nftContract = new ethers_1.ethers.Contract(contractAddresses.soulboundNft, balanceAbi, provider);
            const nftBalance = await nftContract.balanceOf(wallet.address);
            console.log(`SoulBound NFTs: ${nftBalance.toString()}`);
            if (parseFloat(ethers_1.ethers.formatEther(currentAllowance)) >= 1.0) {
                console.log('DLOOP allowance sufficient for registration');
                // Create metadata with CORRECT identity endpoint
                const metadata = JSON.stringify({
                    name: `AI Governance Node ${nodeConfig.id}`,
                    description: `Automated governance node using ${nodeConfig.strategy} strategy`,
                    endpoint: identityEndpoint, // Using validated identity endpoint
                    nodeType: 'governance',
                    strategy: nodeConfig.strategy.toLowerCase(),
                    version: '2.0.0',
                    registeredAt: Date.now()
                });
                console.log('Registration metadata:');
                console.log(JSON.stringify(JSON.parse(metadata), null, 2));
                // Attempt registration
                const registryContract = new ethers_1.ethers.Contract(contractAddresses.aiNodeRegistry, registryAbi, wallet);
                try {
                    console.log('Attempting registration...');
                    const tx = await registryContract.registerNode(metadata, {
                        gasLimit: '350000',
                        maxFeePerGas: ethers_1.ethers.parseUnits('12', 'gwei'),
                        maxPriorityFeePerGas: ethers_1.ethers.parseUnits('1.5', 'gwei')
                    });
                    console.log(`Transaction submitted: ${tx.hash}`);
                    const receipt = await tx.wait(2);
                    if (receipt && receipt.status === 1) {
                        console.log(`Registration successful for ${nodeConfig.id}`);
                        console.log(`Gas used: ${receipt.gasUsed.toString()}`);
                        console.log(`Block: ${receipt.blockNumber}`);
                        // Verify registration
                        await new Promise(resolve => setTimeout(resolve, 3000));
                        const verifyAbi = ['function getNodeInfo(address) external view returns (tuple(address, string, bool, uint256, uint256, uint256))'];
                        const verifyContract = new ethers_1.ethers.Contract(contractAddresses.aiNodeRegistry, verifyAbi, provider);
                        try {
                            const nodeInfo = await verifyContract.getNodeInfo(wallet.address);
                            const parsedMetadata = JSON.parse(nodeInfo[1]);
                            console.log('Registration verified:');
                            console.log(`Endpoint: ${parsedMetadata.endpoint}`);
                            console.log(`Active: ${nodeInfo[2]}`);
                            if (parsedMetadata.endpoint === identityEndpoint) {
                                console.log('Endpoint verification: CORRECT');
                            }
                            else {
                                console.log('Endpoint verification: INCORRECT');
                            }
                        }
                        catch (verifyError) {
                            console.log('Registration completed - verification may be delayed');
                        }
                    }
                    else {
                        console.log(`Registration failed for ${nodeConfig.id}`);
                    }
                }
                catch (regError) {
                    console.log(`Registration error for ${nodeConfig.id}: ${regError.message}`);
                    if (regError.message.includes('NodeAlreadyRegistered')) {
                        console.log(`${nodeConfig.id} already registered - checking endpoint...`);
                        // Check current endpoint
                        try {
                            const verifyAbi = ['function getNodeInfo(address) external view returns (tuple(address, string, bool, uint256, uint256, uint256))'];
                            const verifyContract = new ethers_1.ethers.Contract(contractAddresses.aiNodeRegistry, verifyAbi, provider);
                            const nodeInfo = await verifyContract.getNodeInfo(wallet.address);
                            const parsedMetadata = JSON.parse(nodeInfo[1]);
                            console.log(`Current endpoint: ${parsedMetadata.endpoint}`);
                            if (parsedMetadata.endpoint !== identityEndpoint) {
                                console.log('Node registered with incorrect endpoint - requires update');
                            }
                            else {
                                console.log('Node already using correct identity endpoint');
                            }
                        }
                        catch (checkError) {
                            console.log('Could not verify current endpoint configuration');
                        }
                    }
                }
            }
            else {
                console.log(`${nodeConfig.id} insufficient DLOOP allowance: ${ethers_1.ethers.formatEther(currentAllowance)}`);
            }
        }
        catch (error) {
            console.log(`Error processing ${nodeConfig.id}: ${error.message}`);
        }
        // Delay between nodes
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    console.log('\nDirect registration process completed');
    console.log('All nodes should now use correct identity endpoint: https://d-loop.io/identity/');
}
directRegistrationWithCorrectEndpoints()
    .then(() => {
    console.log('Direct registration with correct endpoints completed');
    process.exit(0);
})
    .catch((error) => {
    console.error('Direct registration failed:', error.message);
    process.exit(1);
});
//# sourceMappingURL=directRegistrationWithCorrectEndpoints.js.map