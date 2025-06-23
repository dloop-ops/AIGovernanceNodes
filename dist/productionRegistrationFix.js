"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductionRegistrationFix = void 0;
const ethers_1 = require("ethers");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
/**
 * Production registration fix for DLoop AI Governance Nodes
 * Addresses custom error 0x06d919f2 with proper contract interaction
 */
class ProductionRegistrationFix {
    constructor() {
        this.providers = [];
        this.currentProviderIndex = 0;
        this.wallets = [];
        this.initializeProviders();
        this.loadWallets();
    }
    initializeProviders() {
        const urls = [
            `https://sepolia.infura.io/v3/${process.env.BACKUP_INFURA_KEY}`,
            'https://ethereum-sepolia-rpc.publicnode.com',
            process.env.ETHEREUM_RPC_URL
        ].filter(url => url && !url.includes('undefined'));
        this.providers = urls.map(url => new ethers_1.ethers.JsonRpcProvider(url));
    }
    getCurrentProvider() {
        return this.providers[this.currentProviderIndex % this.providers.length];
    }
    rotateProvider() {
        this.currentProviderIndex = (this.currentProviderIndex + 1) % this.providers.length;
    }
    loadWallets() {
        const keys = [
            process.env.AI_NODE_1_PRIVATE_KEY,
            process.env.AI_NODE_2_PRIVATE_KEY,
            process.env.AI_NODE_3_PRIVATE_KEY,
            process.env.AI_NODE_4_PRIVATE_KEY,
            process.env.AI_NODE_5_PRIVATE_KEY
        ];
        this.wallets = keys.map(key => new ethers_1.ethers.Wallet(key));
        this.updateWalletProviders();
    }
    updateWalletProviders() {
        const currentProvider = this.getCurrentProvider();
        this.wallets = this.wallets.map(wallet => wallet.connect(currentProvider));
    }
    /**
     * Check node prerequisites including tokens and NFTs
     */
    async checkNodePrerequisites(nodeIndex) {
        const provider = this.getCurrentProvider();
        const wallet = this.wallets[nodeIndex];
        const tokenAbi = [
            'function balanceOf(address) view returns (uint256)',
            'function allowance(address, address) view returns (uint256)'
        ];
        const nftAbi = ['function balanceOf(address) view returns (uint256)'];
        const tokenContract = new ethers_1.ethers.Contract('0x05B366778566e93abfB8e4A9B794e4ad006446b4', tokenAbi, provider);
        const nftContract = new ethers_1.ethers.Contract('0x6391C14631b2Be5374297fA3110687b80233104c', nftAbi, provider);
        try {
            const balance = await tokenContract.balanceOf(wallet.address);
            const allowance = await tokenContract.allowance(wallet.address, '0x0045c7D99489f1d8A5900243956B0206344417DD');
            const nftBalance = await nftContract.balanceOf(wallet.address);
            const balanceFormatted = ethers_1.ethers.formatEther(balance);
            const allowanceFormatted = ethers_1.ethers.formatEther(allowance);
            const nftCount = Number(nftBalance);
            return {
                tokenBalance: balanceFormatted,
                tokenApproval: allowanceFormatted,
                nftBalance: nftCount,
                ready: parseFloat(balanceFormatted) >= 1000 &&
                    parseFloat(allowanceFormatted) >= 1.0 &&
                    nftCount > 0
            };
        }
        catch (error) {
            this.rotateProvider();
            throw error;
        }
    }
    /**
     * Attempt node registration with error resilience
     */
    async attemptNodeRegistration(nodeIndex) {
        const adminKey = process.env.SOULBOUND_ADMIN_PRIVATE_KEY;
        const provider = this.getCurrentProvider();
        const adminWallet = new ethers_1.ethers.Wallet(adminKey, provider);
        const nodeWallet = this.wallets[nodeIndex];
        const registryAbi = [
            'function registerNodeWithStaking(address nodeAddress, string metadata, uint256 stakeAmount) external',
            'function registerNode(address nodeAddress, string metadata) external',
            'function isNodeRegistered(address nodeAddress) view returns (bool)',
            'function hasRole(bytes32 role, address account) view returns (bool)',
            'function ADMIN_ROLE() view returns (bytes32)',
            'function grantRole(bytes32 role, address account) external'
        ];
        const registry = new ethers_1.ethers.Contract('0x0045c7D99489f1d8A5900243956B0206344417DD', registryAbi, adminWallet);
        const nodeName = `ai-gov-${String(nodeIndex + 1).padStart(2, '0')}`;
        const strategy = (nodeIndex % 2 === 0) ? 'conservative' : 'aggressive';
        const metadata = JSON.stringify({
            name: `AI Governance Node ${nodeName}`,
            description: `Automated governance node using ${strategy} strategy`,
            endpoint: 'https://d-loop.io/identity/identity.json',
            nodeType: 'governance',
            strategy: strategy,
            version: '1.0.0',
            registeredAt: Date.now()
        });
        // Check if already registered
        try {
            const isRegistered = await registry.isNodeRegistered(nodeWallet.address);
            if (isRegistered) {
                return { success: true };
            }
        }
        catch (error) {
            // Continue with registration attempt
        }
        // Ensure admin has proper role
        try {
            const adminRole = await registry.ADMIN_ROLE();
            const hasRole = await registry.hasRole(adminRole, adminWallet.address);
            if (!hasRole) {
                try {
                    const grantTx = await registry.grantRole(adminRole, adminWallet.address);
                    await grantTx.wait();
                }
                catch (roleError) {
                    // Role assignment failed but continue with registration
                }
            }
        }
        catch (error) {
            // Role check failed but continue
        }
        // Attempt registration with multiple approaches
        const approaches = [
            // Approach 1: Standard registration with staking
            async () => {
                const stakeAmount = ethers_1.ethers.parseEther('1.0');
                const tx = await registry.registerNodeWithStaking(nodeWallet.address, metadata, stakeAmount, { gasLimit: 500000 });
                return await tx.wait();
            },
            // Approach 2: Basic registration without staking
            async () => {
                const tx = await registry.registerNode(nodeWallet.address, metadata, { gasLimit: 300000 });
                return await tx.wait();
            }
        ];
        for (const approach of approaches) {
            try {
                const receipt = await approach();
                return {
                    success: true,
                    txHash: receipt.hash
                };
            }
            catch (error) {
                if (error.message.includes('rate limit') || error.message.includes('Too Many Requests')) {
                    this.rotateProvider();
                    this.updateWalletProviders();
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
                continue;
            }
        }
        return {
            success: false,
            error: 'All registration approaches failed'
        };
    }
    /**
     * Execute registration for all nodes
     */
    async executeProductionFix() {
        console.log('='.repeat(70));
        console.log('DLOOP AI GOVERNANCE NODE PRODUCTION FIX');
        console.log('='.repeat(70));
        // Test provider connectivity
        let connectedProvider = false;
        for (let i = 0; i < this.providers.length; i++) {
            try {
                const provider = this.getCurrentProvider();
                const blockNumber = await provider.getBlockNumber();
                console.log(`Connected to provider ${i + 1}, block: ${blockNumber}`);
                connectedProvider = true;
                break;
            }
            catch (error) {
                this.rotateProvider();
            }
        }
        if (!connectedProvider) {
            console.log('No providers available - check RPC configuration');
            return;
        }
        console.log('\nChecking node prerequisites...');
        const nodeResults = [];
        let readyNodes = 0;
        // Check prerequisites for all nodes
        for (let i = 0; i < 5; i++) {
            const nodeName = `ai-gov-${String(i + 1).padStart(2, '0')}`;
            try {
                const prereqs = await this.checkNodePrerequisites(i);
                console.log(`${nodeName}: Balance=${prereqs.tokenBalance} DLOOP, ` +
                    `Approval=${prereqs.tokenApproval}, NFT=${prereqs.nftBalance}, ` +
                    `Ready=${prereqs.ready ? 'Yes' : 'No'}`);
                nodeResults.push({
                    index: i,
                    name: nodeName,
                    ...prereqs
                });
                if (prereqs.ready)
                    readyNodes++;
            }
            catch (error) {
                console.log(`${nodeName}: Prerequisites check failed`);
                nodeResults.push({
                    index: i,
                    name: nodeName,
                    ready: false
                });
            }
        }
        console.log(`\nReady nodes: ${readyNodes}/5`);
        if (readyNodes === 0) {
            console.log('No nodes are ready for registration');
            return;
        }
        console.log('\nExecuting node registrations...');
        let successfulRegistrations = 0;
        for (const node of nodeResults) {
            if (!node.ready) {
                console.log(`Skipping ${node.name} - prerequisites not met`);
                continue;
            }
            console.log(`\nRegistering ${node.name}...`);
            try {
                const result = await this.attemptNodeRegistration(node.index);
                if (result.success) {
                    if (result.txHash) {
                        console.log(`${node.name} registered successfully: ${result.txHash}`);
                    }
                    else {
                        console.log(`${node.name} already registered`);
                    }
                    successfulRegistrations++;
                }
                else {
                    console.log(`${node.name} registration failed: ${result.error}`);
                }
            }
            catch (error) {
                console.log(`${node.name} registration error: ${error.message}`);
            }
            // Rate limiting delay
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
        console.log('\n' + '='.repeat(70));
        console.log('PRODUCTION FIX RESULTS');
        console.log('='.repeat(70));
        console.log(`\nRegistration Summary:`);
        console.log(`- Ready nodes: ${readyNodes}/5`);
        console.log(`- Successful registrations: ${successfulRegistrations}/5`);
        console.log(`- System coverage: ${Math.round((successfulRegistrations / 5) * 100)}%`);
        if (successfulRegistrations >= 3) {
            console.log('\nSYSTEM STATUS: OPERATIONAL');
            console.log('Sufficient nodes for governance operations');
            console.log('Automated trading and proposals can commence');
        }
        else if (successfulRegistrations >= 1) {
            console.log('\nSYSTEM STATUS: LIMITED OPERATION');
            console.log('Partial governance capability available');
            console.log('Continue monitoring for additional registrations');
        }
        else {
            console.log('\nSYSTEM STATUS: REGISTRATION PENDING');
            console.log('Infrastructure ready but registrations need completion');
            console.log('Check admin permissions and contract requirements');
        }
        console.log('\nNext Steps:');
        console.log('- Monitor blockchain for transaction confirmations');
        console.log('- Verify registered nodes become active');
        console.log('- Begin governance and trading operations');
        console.log('\n' + '='.repeat(70));
    }
}
exports.ProductionRegistrationFix = ProductionRegistrationFix;
/**
 * Execute the production registration fix
 */
async function main() {
    try {
        const fix = new ProductionRegistrationFix();
        await fix.executeProductionFix();
    }
    catch (error) {
        console.error('Production fix failed:', error);
        process.exit(1);
    }
}
if (require.main === module) {
    main();
}
//# sourceMappingURL=productionRegistrationFix.js.map