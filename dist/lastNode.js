"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ethers_1 = require("ethers");
async function authenticateLastNode() {
    console.log('Authenticating the last governance node with correct endpoints');
    try {
        // Use the most reliable provider
        const provider = new ethers_1.ethers.JsonRpcProvider('https://sepolia.gateway.tenderly.co');
        await provider.getBlockNumber();
        console.log('Connected to Tenderly provider');
        // Contract addresses
        const contractAddresses = {
            aiNodeRegistry: '0x0045c7D99489f1d8A5900243956B0206344417DD',
            dloopToken: '0x05B366778566e93abfB8e4A9B794e4ad006446b4',
            soulboundNft: '0x6391C14631b2Be5374297fA3110687b80233104c'
        };
        // Use the last node as a test case
        const nodeConfig = {
            nodeId: 'ai-gov-05',
            privateKey: process.env.AI_NODE_5_PRIVATE_KEY,
            address: '0x00FfF703fa6837A1a46b3DF9B6a047404046379E',
            endpoint: 'https://governance-node-ai-gov-05.d-loop.io' // Correct endpoint from identity.json
        };
        if (!nodeConfig.privateKey) {
            throw new Error('Private key not found for ai-gov-05');
        }
        const wallet = new ethers_1.ethers.Wallet(nodeConfig.privateKey, provider);
        // Check current status
        console.log(`Checking status for ${nodeConfig.nodeId}`);
        // Check balances
        const ethBalance = await provider.getBalance(wallet.address);
        console.log(`ETH balance: ${ethers_1.ethers.formatEther(ethBalance)}`);
        // Check DLOOP balance
        const dloopAbi = ['function balanceOf(address) external view returns (uint256)'];
        const dloopContract = new ethers_1.ethers.Contract(contractAddresses.dloopToken, dloopAbi, provider);
        const dloopBalance = await dloopContract.balanceOf(wallet.address);
        console.log(`DLOOP balance: ${ethers_1.ethers.formatEther(dloopBalance)}`);
        // Check SoulBound NFT authentication
        const nftAbi = ['function balanceOf(address) external view returns (uint256)'];
        const nftContract = new ethers_1.ethers.Contract(contractAddresses.soulboundNft, nftAbi, provider);
        const nftBalance = await nftContract.balanceOf(wallet.address);
        console.log(`SoulBound NFT count: ${nftBalance.toString()}`);
        // Check node registration status using minimal ABI
        const registryAbi = ['function getNodeInfo(address) external view returns (tuple(address, string, bool, uint256, uint256, uint256))'];
        const registryContract = new ethers_1.ethers.Contract(contractAddresses.aiNodeRegistry, registryAbi, provider);
        let isRegistered = false;
        try {
            const nodeInfo = await registryContract.getNodeInfo(wallet.address);
            console.log(`Node ${nodeConfig.nodeId} is already registered`);
            console.log('Registration metadata:', nodeInfo[1]);
            isRegistered = true;
        }
        catch (error) {
            if (error.message.includes('NodeNotRegistered') || error.data?.includes('0x014f5568')) {
                console.log(`Node ${nodeConfig.nodeId} needs registration`);
            }
            else {
                throw error;
            }
        }
        // If not registered, attempt registration with correct endpoint
        if (!isRegistered) {
            console.log(`Attempting registration for ${nodeConfig.nodeId} with correct endpoint`);
            // Prepare metadata with correct d-loop.io endpoint
            const metadata = JSON.stringify({
                name: `AI Governance Node ${nodeConfig.nodeId}`,
                description: `Automated governance node using Conservative strategy`,
                endpoint: nodeConfig.endpoint, // This is now d-loop.io
                nodeType: 'governance',
                strategy: 'conservative',
                version: '1.0.0',
                registeredAt: Date.now()
            });
            console.log('Registration metadata:', metadata);
            // Create interface for registration
            const registrationAbi = ['function registerNode(string metadata) external'];
            const registrationContract = new ethers_1.ethers.Contract(contractAddresses.aiNodeRegistry, registrationAbi, wallet);
            try {
                // Attempt registration with fixed gas limit
                const tx = await registrationContract.registerNode(metadata, {
                    gasLimit: '350000',
                    maxFeePerGas: ethers_1.ethers.parseUnits('15', 'gwei'),
                    maxPriorityFeePerGas: ethers_1.ethers.parseUnits('1.5', 'gwei')
                });
                console.log(`Registration transaction submitted: ${tx.hash}`);
                const receipt = await tx.wait(1);
                if (receipt && receipt.status === 1) {
                    console.log(`Successfully registered ${nodeConfig.nodeId}`);
                    console.log(`Gas used: ${receipt.gasUsed.toString()}`);
                    // Verify registration
                    const verificationInfo = await registryContract.getNodeInfo(wallet.address);
                    console.log('Verification successful - Node is now registered');
                    console.log('Final metadata:', verificationInfo[1]);
                }
                else {
                    console.log(`Registration transaction failed for ${nodeConfig.nodeId}`);
                }
            }
            catch (regError) {
                console.log(`Registration error: ${regError.message}`);
                if (regError.message.includes('NodeAlreadyRegistered')) {
                    console.log(`Node ${nodeConfig.nodeId} was already registered`);
                }
                else if (regError.data === '0x06d919f2') {
                    console.log('Gas estimation error - this may indicate a contract validation issue');
                }
            }
        }
        // Final status summary
        console.log('\n=== Node Authentication Summary ===');
        console.log(`Node ID: ${nodeConfig.nodeId}`);
        console.log(`Address: ${nodeConfig.address}`);
        console.log(`Endpoint: ${nodeConfig.endpoint}`);
        console.log(`ETH Balance: ${ethers_1.ethers.formatEther(ethBalance)}`);
        console.log(`DLOOP Balance: ${ethers_1.ethers.formatEther(dloopBalance)}`);
        console.log(`SoulBound NFTs: ${nftBalance.toString()}`);
        console.log(`Registration Status: ${isRegistered ? 'REGISTERED' : 'PENDING'}`);
        if (parseFloat(ethers_1.ethers.formatEther(ethBalance)) > 0.001 &&
            parseFloat(ethers_1.ethers.formatEther(dloopBalance)) > 1000 &&
            nftBalance > 0) {
            console.log('Node is fully authenticated and ready for governance operations');
        }
        else {
            console.log('Node may require additional setup for full operation');
        }
    }
    catch (error) {
        console.error('Authentication process failed:', error.message);
        throw error;
    }
}
authenticateLastNode()
    .then(() => {
    console.log('Node authentication process completed');
    process.exit(0);
})
    .catch((error) => {
    console.error('Authentication failed:', error.message);
    process.exit(1);
});
//# sourceMappingURL=lastNode.js.map