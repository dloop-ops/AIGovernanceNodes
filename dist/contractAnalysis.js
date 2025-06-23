"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ethers_1 = require("ethers");
async function analyzeContractRequirements() {
    console.log('Analyzing AI Node Registry contract requirements');
    const provider = new ethers_1.ethers.JsonRpcProvider('https://sepolia.gateway.tenderly.co');
    const contractAddresses = {
        aiNodeRegistry: '0x0045c7D99489f1d8A5900243956B0206344417DD',
        dloopToken: '0x05B366778566e93abfB8e4A9B794e4ad006446b4',
        soulboundNft: '0x6391C14631b2Be5374297fA3110687b80233104c'
    };
    // Enhanced ABI for contract analysis
    const registryABI = [
        'function registerNode(string metadata) external',
        'function getNodeInfo(address) external view returns (tuple(address, string, bool, uint256, uint256, uint256))',
        'function isNodeRegistered(address) external view returns (bool)',
        'function getRegistrationRequirements() external view returns (uint256)',
        'function owner() external view returns (address)',
        'function paused() external view returns (bool)'
    ];
    const dloopABI = [
        'function balanceOf(address) external view returns (uint256)',
        'function allowance(address, address) external view returns (uint256)',
        'function decimals() external view returns (uint8)'
    ];
    const soulboundABI = [
        'function balanceOf(address) external view returns (uint256)',
        'function tokenURI(uint256) external view returns (string)',
        'function ownerOf(uint256) external view returns (address)'
    ];
    try {
        // Analyze contract state
        const registryContract = new ethers_1.ethers.Contract(contractAddresses.aiNodeRegistry, registryABI, provider);
        const dloopContract = new ethers_1.ethers.Contract(contractAddresses.dloopToken, dloopABI, provider);
        const soulboundContract = new ethers_1.ethers.Contract(contractAddresses.soulboundNft, soulboundABI, provider);
        console.log('Contract state analysis:');
        // Check if registry is paused
        try {
            const isPaused = await registryContract.paused();
            console.log(`Registry paused: ${isPaused}`);
        }
        catch (error) {
            console.log('Registry pause check: Not implemented or accessible');
        }
        // Check registry owner
        try {
            const owner = await registryContract.owner();
            console.log(`Registry owner: ${owner}`);
        }
        catch (error) {
            console.log('Registry owner check: Not accessible');
        }
        // Check DLOOP token decimals
        const decimals = await dloopContract.decimals();
        console.log(`DLOOP decimals: ${decimals}`);
        // Analyze node requirements
        const nodeConfigs = [
            { id: 'ai-gov-01', key: process.env.AI_NODE_1_PRIVATE_KEY },
            { id: 'ai-gov-02', key: process.env.AI_NODE_2_PRIVATE_KEY },
            { id: 'ai-gov-03', key: process.env.AI_NODE_3_PRIVATE_KEY },
            { id: 'ai-gov-04', key: process.env.AI_NODE_4_PRIVATE_KEY },
            { id: 'ai-gov-05', key: process.env.AI_NODE_5_PRIVATE_KEY }
        ];
        console.log('\nNode requirement analysis:');
        for (const nodeConfig of nodeConfigs) {
            if (!nodeConfig.key) {
                console.log(`${nodeConfig.id}: Skipping - authentication required`);
                continue;
            }
            const wallet = new ethers_1.ethers.Wallet(nodeConfig.key, provider);
            console.log(`\n${nodeConfig.id} (${wallet.address}):`);
            // Check ETH balance
            const ethBalance = await provider.getBalance(wallet.address);
            console.log(`  ETH: ${ethers_1.ethers.formatEther(ethBalance)}`);
            // Check DLOOP balance
            const dloopBalance = await dloopContract.balanceOf(wallet.address);
            console.log(`  DLOOP: ${ethers_1.ethers.formatUnits(dloopBalance, decimals)}`);
            // Check DLOOP allowance
            const allowance = await dloopContract.allowance(wallet.address, contractAddresses.aiNodeRegistry);
            console.log(`  DLOOP allowance: ${ethers_1.ethers.formatUnits(allowance, decimals)}`);
            // Check SoulBound NFT
            const nftBalance = await soulboundContract.balanceOf(wallet.address);
            console.log(`  SoulBound NFTs: ${nftBalance.toString()}`);
            // Check if already registered
            try {
                const isRegistered = await registryContract.isNodeRegistered(wallet.address);
                console.log(`  Registered: ${isRegistered}`);
            }
            catch (error) {
                try {
                    // Try alternative method
                    await registryContract.getNodeInfo(wallet.address);
                    console.log(`  Registered: true (via getNodeInfo)`);
                }
                catch (nodeError) {
                    if (nodeError.message.includes('NodeNotRegistered')) {
                        console.log(`  Registered: false (NodeNotRegistered)`);
                    }
                    else {
                        console.log(`  Registration check failed: ${nodeError.message}`);
                    }
                }
            }
            // Requirement summary
            const hasETH = parseFloat(ethers_1.ethers.formatEther(ethBalance)) > 0.001;
            const hasDLOOP = parseFloat(ethers_1.ethers.formatUnits(dloopBalance, decimals)) >= 1000;
            const hasAllowance = parseFloat(ethers_1.ethers.formatUnits(allowance, decimals)) >= 1.0;
            const hasNFT = nftBalance.toString() !== '0';
            console.log(`  Requirements met: ETH:${hasETH}, DLOOP:${hasDLOOP}, Allowance:${hasAllowance}, NFT:${hasNFT}`);
        }
        // Test registration metadata format
        console.log('\nTesting metadata format:');
        const testMetadata = JSON.stringify({
            name: 'AI Governance Node test',
            description: 'Test node for metadata validation',
            endpoint: 'https://d-loop.io/identity/identity.json',
            nodeType: 'governance',
            strategy: 'conservative',
            version: '2.0.0',
            registeredAt: Date.now()
        });
        console.log(`Metadata length: ${testMetadata.length} characters`);
        console.log(`Sample metadata: ${testMetadata.substring(0, 200)}...`);
    }
    catch (error) {
        console.error('Contract analysis failed:', error.message);
    }
}
analyzeContractRequirements()
    .then(() => {
    console.log('Contract analysis completed');
    process.exit(0);
})
    .catch((error) => {
    console.error('Analysis failed:', error.message);
    process.exit(1);
});
//# sourceMappingURL=contractAnalysis.js.map