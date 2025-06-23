"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ethers_1 = require("ethers");
const fs_1 = __importDefault(require("fs"));
async function finalNodeRegistrationWithIdentityEndpoint() {
    console.log('Final node registration using identity endpoint and ABI v2');
    const provider = new ethers_1.ethers.JsonRpcProvider('https://sepolia.gateway.tenderly.co');
    const contractAddresses = {
        aiNodeRegistry: '0x0045c7D99489f1d8A5900243956B0206344417DD',
        dloopToken: '0x05B366778566e93abfB8e4A9B794e4ad006446b4',
        soulboundNft: '0x6391C14631b2Be5374297fA3110687b80233104c'
    };
    // Load enhanced ABI v2 for proper registration
    let registryABI;
    try {
        const abiData = fs_1.default.readFileSync('./abis/ainoderegistry.abi.v2.json', 'utf8');
        registryABI = JSON.parse(abiData);
        console.log('Loaded AI Node Registry ABI v2 for enhanced registration');
    }
    catch (error) {
        console.log('Using fallback ABI for registration');
        registryABI = [
            'function registerNode(string metadata) external',
            'function getNodeInfo(address) external view returns (tuple(address, string, bool, uint256, uint256, uint256))'
        ];
    }
    // All governance nodes with validated identity endpoint
    const nodeConfigs = [
        { index: 0, id: 'ai-gov-01', key: process.env.AI_NODE_1_PRIVATE_KEY, strategy: 'Conservative' },
        { index: 1, id: 'ai-gov-02', key: process.env.AI_NODE_2_PRIVATE_KEY, strategy: 'Aggressive' },
        { index: 2, id: 'ai-gov-03', key: process.env.AI_NODE_3_PRIVATE_KEY, strategy: 'Conservative' },
        { index: 3, id: 'ai-gov-04', key: process.env.AI_NODE_4_PRIVATE_KEY, strategy: 'Aggressive' },
        { index: 4, id: 'ai-gov-05', key: process.env.AI_NODE_5_PRIVATE_KEY, strategy: 'Conservative' }
    ];
    const identityEndpoint = 'https://d-loop.io/identity/'; // Validated from identity.json
    let registeredCount = 0;
    let alreadyRegisteredCount = 0;
    console.log('Processing all governance nodes with identity endpoint...');
    for (const nodeConfig of nodeConfigs) {
        if (!nodeConfig.key) {
            console.log(`Skipping ${nodeConfig.id} - authentication required`);
            continue;
        }
        try {
            const wallet = new ethers_1.ethers.Wallet(nodeConfig.key, provider);
            console.log(`\n=== Processing ${nodeConfig.id} ===`);
            console.log(`Address: ${wallet.address}`);
            // Check ETH balance
            const ethBalance = await provider.getBalance(wallet.address);
            console.log(`ETH balance: ${ethers_1.ethers.formatEther(ethBalance)}`);
            // Check DLOOP allowance
            const dloopAbi = ['function allowance(address, address) external view returns (uint256)'];
            const dloopContract = new ethers_1.ethers.Contract(contractAddresses.dloopToken, dloopAbi, provider);
            const allowance = await dloopContract.allowance(wallet.address, contractAddresses.aiNodeRegistry);
            console.log(`DLOOP allowance: ${ethers_1.ethers.formatEther(allowance)}`);
            // Check SoulBound NFT balance
            const balanceAbi = ['function balanceOf(address) external view returns (uint256)'];
            const nftContract = new ethers_1.ethers.Contract(contractAddresses.soulboundNft, balanceAbi, provider);
            const nftBalance = await nftContract.balanceOf(wallet.address);
            console.log(`SoulBound NFTs: ${nftBalance.toString()}`);
            // Verify prerequisites
            if (parseFloat(ethers_1.ethers.formatEther(ethBalance)) < 0.001) {
                console.log(`${nodeConfig.id} insufficient ETH for gas`);
                continue;
            }
            if (parseFloat(ethers_1.ethers.formatEther(allowance)) < 1.0) {
                console.log(`${nodeConfig.id} insufficient DLOOP allowance`);
                continue;
            }
            if (nftBalance.toString() === '0') {
                console.log(`${nodeConfig.id} requires SoulBound NFT authentication`);
                continue;
            }
            console.log('Prerequisites verified - proceeding with registration');
            // Check if already registered
            const registryContract = new ethers_1.ethers.Contract(contractAddresses.aiNodeRegistry, registryABI, provider);
            try {
                const nodeInfo = await registryContract.getNodeInfo(wallet.address);
                const metadata = JSON.parse(nodeInfo[1]);
                console.log(`${nodeConfig.id} already registered`);
                console.log(`Current endpoint: ${metadata.endpoint}`);
                if (metadata.endpoint === identityEndpoint) {
                    console.log('Endpoint is correct - no update needed');
                    alreadyRegisteredCount++;
                }
                else {
                    console.log('Endpoint needs updating to identity format');
                }
                continue;
            }
            catch (error) {
                if (!error.message.includes('NodeNotRegistered')) {
                    console.log(`Error checking registration: ${error.message}`);
                    continue;
                }
                console.log('Node not registered - proceeding with registration');
            }
            // Create metadata with identity endpoint
            const metadata = JSON.stringify({
                name: `AI Governance Node ${nodeConfig.id}`,
                description: `Automated governance node using ${nodeConfig.strategy} strategy`,
                endpoint: identityEndpoint,
                nodeType: 'governance',
                strategy: nodeConfig.strategy.toLowerCase(),
                version: '2.0.0',
                registeredAt: Date.now()
            });
            console.log('Registration metadata:');
            console.log(JSON.stringify(JSON.parse(metadata), null, 2));
            // Execute registration with enhanced gas settings
            const registryWithWallet = new ethers_1.ethers.Contract(contractAddresses.aiNodeRegistry, registryABI, wallet);
            try {
                // Estimate gas with buffer
                const gasEstimate = await registryWithWallet.registerNode.estimateGas(metadata);
                const gasLimit = (gasEstimate * 130n) / 100n; // 30% buffer
                console.log(`Gas estimate: ${gasEstimate.toString()}`);
                console.log(`Gas limit: ${gasLimit.toString()}`);
                const tx = await registryWithWallet.registerNode(metadata, {
                    gasLimit: gasLimit.toString(),
                    maxFeePerGas: ethers_1.ethers.parseUnits('15', 'gwei'),
                    maxPriorityFeePerGas: ethers_1.ethers.parseUnits('2', 'gwei')
                });
                console.log(`Registration transaction: ${tx.hash}`);
                console.log('Waiting for confirmation...');
                const receipt = await tx.wait(2);
                if (receipt && receipt.status === 1) {
                    console.log(`✓ ${nodeConfig.id} registration successful`);
                    console.log(`Gas used: ${receipt.gasUsed.toString()}`);
                    console.log(`Block: ${receipt.blockNumber}`);
                    registeredCount++;
                    // Verify registration
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    try {
                        const verifiedNodeInfo = await registryContract.getNodeInfo(wallet.address);
                        const verifiedMetadata = JSON.parse(verifiedNodeInfo[1]);
                        console.log('Registration verified:');
                        console.log(`✓ Endpoint: ${verifiedMetadata.endpoint}`);
                        console.log(`✓ Active: ${verifiedNodeInfo[2]}`);
                    }
                    catch (verifyError) {
                        console.log('Registration completed - verification pending');
                    }
                }
                else {
                    console.log(`✗ ${nodeConfig.id} registration failed`);
                }
            }
            catch (regError) {
                console.log(`Registration error: ${regError.message}`);
                if (regError.message.includes('NodeAlreadyRegistered')) {
                    console.log(`${nodeConfig.id} was registered during process`);
                    alreadyRegisteredCount++;
                }
                else if (regError.message.includes('insufficient funds')) {
                    console.log(`${nodeConfig.id} insufficient ETH for transaction`);
                }
                else if (regError.message.includes('execution reverted')) {
                    console.log(`${nodeConfig.id} smart contract execution reverted`);
                }
            }
        }
        catch (error) {
            console.log(`Error processing ${nodeConfig.id}: ${error.message}`);
        }
        // Delay between registrations
        await new Promise(resolve => setTimeout(resolve, 3000));
    }
    console.log('\n=== Final Registration Summary ===');
    console.log(`Newly registered: ${registeredCount}`);
    console.log(`Already registered: ${alreadyRegisteredCount}`);
    console.log(`Total nodes with identity endpoint: ${registeredCount + alreadyRegisteredCount}`);
    console.log(`Identity endpoint: ${identityEndpoint}`);
    if (registeredCount + alreadyRegisteredCount === 5) {
        console.log('✓ All governance nodes are registered with correct identity endpoint');
    }
    else {
        console.log(`⚠ ${5 - (registeredCount + alreadyRegisteredCount)} nodes still require registration`);
    }
}
finalNodeRegistrationWithIdentityEndpoint()
    .then(() => {
    console.log('Final node registration completed');
    process.exit(0);
})
    .catch((error) => {
    console.error('Final registration failed:', error.message);
    process.exit(1);
});
//# sourceMappingURL=finalNodeRegistrationWithIdentityEndpoint.js.map