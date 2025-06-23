"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ethers_1 = require("ethers");
async function resolveNodeRegistration() {
    console.log('Analyzing smart contract requirements for node registration');
    const provider = new ethers_1.ethers.JsonRpcProvider('https://sepolia.gateway.tenderly.co');
    const contractAddresses = {
        aiNodeRegistry: '0x0045c7D99489f1d8A5900243956B0206344417DD',
        dloopToken: '0x05B366778566e93abfB8e4A9B794e4ad006446b4',
        soulboundNft: '0x6391C14631b2Be5374297fA3110687b80233104c'
    };
    const nodeConfig = {
        id: 'ai-gov-01',
        privateKey: process.env.AI_NODE_1_PRIVATE_KEY,
        address: '0x561529036AB886c1FD3D112360383D79fBA9E71c'
    };
    if (!nodeConfig.privateKey) {
        console.log('Authentication required: Node private key not available');
        return;
    }
    try {
        const wallet = new ethers_1.ethers.Wallet(nodeConfig.privateKey, provider);
        console.log(`Analyzing requirements for ${nodeConfig.id}`);
        console.log(`Address: ${wallet.address}`);
        // Check all balances and requirements
        const ethBalance = await provider.getBalance(wallet.address);
        console.log(`ETH balance: ${ethers_1.ethers.formatEther(ethBalance)}`);
        const dloopAbi = [
            'function balanceOf(address) external view returns (uint256)',
            'function allowance(address, address) external view returns (uint256)'
        ];
        const dloopContract = new ethers_1.ethers.Contract(contractAddresses.dloopToken, dloopAbi, provider);
        const dloopBalance = await dloopContract.balanceOf(wallet.address);
        const dloopAllowance = await dloopContract.allowance(wallet.address, contractAddresses.aiNodeRegistry);
        console.log(`DLOOP balance: ${ethers_1.ethers.formatEther(dloopBalance)}`);
        console.log(`DLOOP allowance: ${ethers_1.ethers.formatEther(dloopAllowance)}`);
        const nftAbi = ['function balanceOf(address) external view returns (uint256)'];
        const nftContract = new ethers_1.ethers.Contract(contractAddresses.soulboundNft, nftAbi, provider);
        const nftBalance = await nftContract.balanceOf(wallet.address);
        console.log(`SoulBound NFT balance: ${nftBalance.toString()}`);
        // Check specific contract requirements
        const registryAbi = [
            'function nodeStakeAmount() external view returns (uint256)',
            'function minimumStakeAmount() external view returns (uint256)',
            'function isNodeActive(address) external view returns (bool)',
            'function getNodeInfo(address) external view returns (tuple(address, string, bool, uint256, uint256, uint256))'
        ];
        const registryContract = new ethers_1.ethers.Contract(contractAddresses.aiNodeRegistry, registryAbi, provider);
        try {
            const stakeAmount = await registryContract.nodeStakeAmount();
            console.log(`Required stake: ${ethers_1.ethers.formatEther(stakeAmount)} DLOOP`);
        }
        catch (stakeError) {
            console.log('Could not retrieve stake amount from contract');
        }
        try {
            const minStake = await registryContract.minimumStakeAmount();
            console.log(`Minimum stake: ${ethers_1.ethers.formatEther(minStake)} DLOOP`);
        }
        catch (minError) {
            console.log('Could not retrieve minimum stake amount');
        }
        // Analyze requirements
        const hasEth = parseFloat(ethers_1.ethers.formatEther(ethBalance)) > 0.001;
        const hasDloop = parseFloat(ethers_1.ethers.formatEther(dloopBalance)) >= 1000;
        const hasAllowance = parseFloat(ethers_1.ethers.formatEther(dloopAllowance)) >= 1000;
        const hasNft = nftBalance > 0;
        console.log('\nRequirement Analysis:');
        console.log(`ETH for gas: ${hasEth ? 'SUFFICIENT' : 'INSUFFICIENT'}`);
        console.log(`DLOOP tokens: ${hasDloop ? 'SUFFICIENT' : 'INSUFFICIENT'}`);
        console.log(`DLOOP allowance: ${hasAllowance ? 'APPROVED' : 'NEEDS_APPROVAL'}`);
        console.log(`SoulBound NFT: ${hasNft ? 'AUTHENTICATED' : 'MISSING'}`);
        // If allowance is insufficient, approve tokens first
        if (!hasAllowance && hasDloop) {
            console.log('\nApproving DLOOP tokens for staking...');
            const approveAbi = ['function approve(address, uint256) external returns (bool)'];
            const approveContract = new ethers_1.ethers.Contract(contractAddresses.dloopToken, approveAbi, wallet);
            const approveAmount = ethers_1.ethers.parseEther('2000'); // Approve 2000 DLOOP
            const approveTx = await approveContract.approve(contractAddresses.aiNodeRegistry, approveAmount, {
                gasLimit: '100000',
                maxFeePerGas: ethers_1.ethers.parseUnits('10', 'gwei'),
                maxPriorityFeePerGas: ethers_1.ethers.parseUnits('1', 'gwei')
            });
            console.log(`Approval transaction: ${approveTx.hash}`);
            const approveReceipt = await approveTx.wait(1);
            if (approveReceipt && approveReceipt.status === 1) {
                console.log('DLOOP approval successful');
                // Verify new allowance
                const newAllowance = await dloopContract.allowance(wallet.address, contractAddresses.aiNodeRegistry);
                console.log(`New allowance: ${ethers_1.ethers.formatEther(newAllowance)} DLOOP`);
            }
            else {
                console.log('DLOOP approval failed');
                return;
            }
        }
        // Now attempt registration with all requirements met
        if (hasEth && hasDloop && hasNft) {
            console.log('\nAttempting registration with verified requirements...');
            const registerAbi = ['function registerNode(string metadata) external'];
            const registerContract = new ethers_1.ethers.Contract(contractAddresses.aiNodeRegistry, registerAbi, wallet);
            const metadata = JSON.stringify({
                name: `AI Governance Node ${nodeConfig.id}`,
                description: 'Automated governance node using Conservative strategy',
                endpoint: `https://governance-node-${nodeConfig.id}.d-loop.io`,
                nodeType: 'governance',
                strategy: 'conservative',
                version: '2.0.0',
                registeredAt: Date.now()
            });
            console.log(`Endpoint: https://governance-node-${nodeConfig.id}.d-loop.io`);
            try {
                const tx = await registerContract.registerNode(metadata, {
                    gasLimit: '400000',
                    maxFeePerGas: ethers_1.ethers.parseUnits('12', 'gwei'),
                    maxPriorityFeePerGas: ethers_1.ethers.parseUnits('1.5', 'gwei')
                });
                console.log(`Registration transaction: ${tx.hash}`);
                const receipt = await tx.wait(2);
                if (receipt && receipt.status === 1) {
                    console.log('Registration successful!');
                    console.log(`Gas used: ${receipt.gasUsed.toString()}`);
                    // Verify registration
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    try {
                        const nodeInfo = await registryContract.getNodeInfo(wallet.address);
                        const parsedMetadata = JSON.parse(nodeInfo[1]);
                        console.log('Registration verified successfully');
                        console.log(`Registered endpoint: ${parsedMetadata.endpoint}`);
                        console.log(`Node active: ${nodeInfo[2]}`);
                        if (parsedMetadata.endpoint.includes('d-loop.io')) {
                            console.log('Endpoint verification: CORRECT');
                            console.log('First governance node successfully registered');
                            console.log('System ready to register remaining nodes');
                        }
                    }
                    catch (verifyError) {
                        console.log('Registration completed but verification pending');
                    }
                }
            }
            catch (regError) {
                console.log(`Registration failed: ${regError.message}`);
                if (regError.message.includes('NodeAlreadyRegistered')) {
                    console.log('Node was already registered');
                }
                else if (regError.data === '0x') {
                    console.log('Contract validation failed - missing requirement');
                }
            }
        }
        else {
            console.log('\nRegistration requirements not met:');
            if (!hasEth)
                console.log('- Need more ETH for gas fees');
            if (!hasDloop)
                console.log('- Need DLOOP tokens for staking');
            if (!hasNft)
                console.log('- Need SoulBound NFT for authentication');
        }
    }
    catch (error) {
        console.error('Analysis failed:', error.message);
    }
}
resolveNodeRegistration()
    .then(() => {
    console.log('Registration analysis completed');
    process.exit(0);
})
    .catch((error) => {
    console.error('Analysis failed:', error.message);
    process.exit(1);
});
//# sourceMappingURL=resolveNodeRegistration.js.map