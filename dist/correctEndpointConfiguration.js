"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ethers_1 = require("ethers");
async function correctEndpointConfiguration() {
    console.log('Correcting endpoint configuration based on d-loop.io identity specification');
    // Identity configuration from https://d-loop.io/identity/identity.json
    const identityConfig = {
        SoulboundNFT: {
            address: "0x6391C14631b2Be5374297fA3110687b80233104c",
            args: [
                "D-Loop Identity",
                "DLOOP-ID",
                "https://d-loop.io/identity/",
                [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 21, 22, 23, 24, 25]
            ]
        }
    };
    console.log('Identity Configuration Analysis:');
    console.log('Base identity URL:', identityConfig.SoulboundNFT.args[2]);
    console.log('Supported node IDs:', identityConfig.SoulboundNFT.args[3]);
    // Correct endpoint configuration using identity base URL
    const correctEndpoint = identityConfig.SoulboundNFT.args[2]; // "https://d-loop.io/identity/"
    console.log('\nEndpoint Correction:');
    console.log('Previous (invalid):', 'https://governance-node-ai-gov-01.d-loop.io');
    console.log('Correct endpoint:', correctEndpoint);
    const provider = new ethers_1.ethers.JsonRpcProvider('https://sepolia.gateway.tenderly.co');
    const contractAddresses = {
        aiNodeRegistry: '0x0045c7D99489f1d8A5900243956B0206344417DD',
        dloopToken: '0x05B366778566e93abfB8e4A9B794e4ad006446b4',
        soulboundNft: '0x6391C14631b2Be5374297fA3110687b80233104c'
    };
    // Node configurations with corrected endpoint
    const nodeConfigs = [
        { index: 0, id: 'ai-gov-01', key: process.env.AI_NODE_1_PRIVATE_KEY, strategy: 'Conservative' },
        { index: 1, id: 'ai-gov-02', key: process.env.AI_NODE_2_PRIVATE_KEY, strategy: 'Aggressive' },
        { index: 2, id: 'ai-gov-03', key: process.env.AI_NODE_3_PRIVATE_KEY, strategy: 'Conservative' },
        { index: 3, id: 'ai-gov-04', key: process.env.AI_NODE_4_PRIVATE_KEY, strategy: 'Aggressive' },
        { index: 4, id: 'ai-gov-05', key: process.env.AI_NODE_5_PRIVATE_KEY, strategy: 'Conservative' }
    ];
    console.log('\nProcessing node registration with correct endpoint...');
    // Test with first node using correct endpoint
    const firstNode = nodeConfigs[0];
    if (!firstNode.key) {
        console.log('Authentication required: Node private key not available');
        return;
    }
    try {
        const wallet = new ethers_1.ethers.Wallet(firstNode.key, provider);
        console.log(`Processing ${firstNode.id} with correct endpoint`);
        console.log(`Address: ${wallet.address}`);
        // Verify current allowance
        const dloopAbi = ['function allowance(address, address) external view returns (uint256)'];
        const dloopContract = new ethers_1.ethers.Contract(contractAddresses.dloopToken, dloopAbi, provider);
        const currentAllowance = await dloopContract.allowance(wallet.address, contractAddresses.aiNodeRegistry);
        console.log(`Current DLOOP allowance: ${ethers_1.ethers.formatEther(currentAllowance)}`);
        if (parseFloat(ethers_1.ethers.formatEther(currentAllowance)) >= 1.0) {
            console.log('Allowance sufficient for registration');
            // Create metadata with CORRECT endpoint from identity configuration
            const metadata = JSON.stringify({
                name: `AI Governance Node ${firstNode.id}`,
                description: `Automated governance node using ${firstNode.strategy} strategy`,
                endpoint: correctEndpoint, // Using https://d-loop.io/identity/
                nodeType: 'governance',
                strategy: firstNode.strategy.toLowerCase(),
                version: '2.0.0',
                registeredAt: Date.now()
            });
            console.log('Registration metadata with corrected endpoint:');
            console.log(JSON.stringify(JSON.parse(metadata), null, 2));
            // Attempt registration with correct endpoint
            const registryAbi = ['function registerNode(string metadata) external'];
            const registryContract = new ethers_1.ethers.Contract(contractAddresses.aiNodeRegistry, registryAbi, wallet);
            console.log('Attempting registration with corrected endpoint...');
            const tx = await registryContract.registerNode(metadata, {
                gasLimit: '300000',
                maxFeePerGas: ethers_1.ethers.parseUnits('10', 'gwei'),
                maxPriorityFeePerGas: ethers_1.ethers.parseUnits('1', 'gwei')
            });
            console.log(`Registration transaction: ${tx.hash}`);
            const receipt = await tx.wait(2);
            if (receipt && receipt.status === 1) {
                console.log('Registration successful with correct endpoint');
                console.log(`Gas used: ${receipt.gasUsed.toString()}`);
                // Verify registration
                await new Promise(resolve => setTimeout(resolve, 3000));
                const verifyAbi = ['function getNodeInfo(address) external view returns (tuple(address, string, bool, uint256, uint256, uint256))'];
                const verifyContract = new ethers_1.ethers.Contract(contractAddresses.aiNodeRegistry, verifyAbi, provider);
                try {
                    const nodeInfo = await verifyContract.getNodeInfo(wallet.address);
                    const parsedMetadata = JSON.parse(nodeInfo[1]);
                    console.log('Registration verified successfully');
                    console.log(`Registered endpoint: ${parsedMetadata.endpoint}`);
                    if (parsedMetadata.endpoint === correctEndpoint) {
                        console.log('Endpoint verification: CORRECT');
                        console.log('Using identity base URL as specified');
                        console.log('Ready to register remaining nodes with correct endpoint');
                    }
                }
                catch (verifyError) {
                    console.log('Registration completed - verification may be delayed');
                }
            }
            else {
                console.log('Registration transaction failed');
            }
        }
        else {
            console.log('Insufficient DLOOP allowance for registration');
        }
    }
    catch (error) {
        console.log(`Registration error: ${error.message}`);
        if (error.message.includes('NodeAlreadyRegistered')) {
            console.log('Node already registered - system should update to use correct endpoint');
        }
    }
    console.log('\nEndpoint Correction Summary:');
    console.log('- Invalid endpoints: https://governance-node-{id}.d-loop.io');
    console.log('- Correct endpoint: https://d-loop.io/identity/');
    console.log('- All governance nodes should use the identity base URL');
    console.log('- This aligns with the SoulBound NFT identity system specifications');
}
correctEndpointConfiguration()
    .then(() => {
    console.log('Endpoint configuration correction completed');
    process.exit(0);
})
    .catch((error) => {
    console.error('Endpoint correction failed:', error.message);
    process.exit(1);
});
//# sourceMappingURL=correctEndpointConfiguration.js.map