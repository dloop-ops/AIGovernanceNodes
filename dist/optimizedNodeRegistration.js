"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OptimizedNodeRegistration = void 0;
const ethers_1 = require("ethers");
const dotenv_1 = __importDefault(require("dotenv"));
const winston_1 = __importDefault(require("winston"));
dotenv_1.default.config();
class OptimizedNodeRegistration {
    constructor() {
        this.rpcEndpoints = [];
        this.currentProviderIndex = 0;
        this.contracts = new Map();
        this.nodeConfigs = [];
        this.initializeLogger();
        this.initializeRpcEndpoints();
        this.loadNodeConfigurations();
        this.initializeContracts();
    }
    initializeLogger() {
        this.logger = winston_1.default.createLogger({
            level: 'info',
            format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json()),
            transports: [
                new winston_1.default.transports.Console({
                    format: winston_1.default.format.simple()
                })
            ]
        });
    }
    initializeRpcEndpoints() {
        this.rpcEndpoints = [
            {
                name: 'Primary Infura',
                url: process.env.ETHEREUM_RPC_URL,
                priority: 1,
                healthy: true,
                lastCheck: 0,
                failures: 0
            },
            {
                name: 'Backup Infura',
                url: `https://sepolia.infura.io/v3/${process.env.BACKUP_INFURA_KEY}`,
                priority: 2,
                healthy: true,
                lastCheck: 0,
                failures: 0
            },
            {
                name: 'Tenderly',
                url: 'https://sepolia.gateway.tenderly.co/public',
                priority: 3,
                healthy: true,
                lastCheck: 0,
                failures: 0
            },
            {
                name: 'Ethereum Public',
                url: 'https://ethereum-sepolia-rpc.publicnode.com',
                priority: 4,
                healthy: true,
                lastCheck: 0,
                failures: 0
            }
        ].filter(endpoint => endpoint.url && endpoint.url !== 'undefined');
        this.logger.info(`Initialized ${this.rpcEndpoints.length} RPC endpoints`);
    }
    async getCurrentProvider() {
        for (let attempts = 0; attempts < this.rpcEndpoints.length; attempts++) {
            const endpoint = this.rpcEndpoints[this.currentProviderIndex];
            try {
                const provider = new ethers_1.ethers.JsonRpcProvider(endpoint.url);
                // Test connectivity
                await provider.getNetwork();
                endpoint.healthy = true;
                endpoint.failures = 0;
                endpoint.lastCheck = Date.now();
                this.logger.info(`Using RPC provider: ${endpoint.name}`);
                return provider;
            }
            catch (error) {
                endpoint.healthy = false;
                endpoint.failures++;
                endpoint.lastCheck = Date.now();
                this.logger.warn(`RPC provider ${endpoint.name} failed, rotating to next`);
                this.rotateProvider();
            }
        }
        throw new Error('All RPC providers are unavailable');
    }
    rotateProvider() {
        this.currentProviderIndex = (this.currentProviderIndex + 1) % this.rpcEndpoints.length;
    }
    loadNodeConfigurations() {
        const nodeKeys = [
            'AI_NODE_1_PRIVATE_KEY',
            'AI_NODE_2_PRIVATE_KEY',
            'AI_NODE_3_PRIVATE_KEY',
            'AI_NODE_4_PRIVATE_KEY',
            'AI_NODE_5_PRIVATE_KEY'
        ];
        const strategies = ['conservative', 'aggressive', 'conservative', 'aggressive', 'conservative'];
        for (let i = 0; i < nodeKeys.length; i++) {
            const privateKey = process.env[nodeKeys[i]];
            if (privateKey) {
                const wallet = new ethers_1.ethers.Wallet(privateKey);
                this.nodeConfigs.push({
                    index: i,
                    address: wallet.address,
                    privateKey,
                    name: `AI Governance Node ai-gov-${String(i + 1).padStart(2, '0')}`,
                    strategy: strategies[i]
                });
            }
        }
        this.logger.info(`Loaded ${this.nodeConfigs.length} node configurations`);
    }
    async initializeContracts() {
        const provider = await this.getCurrentProvider();
        // Contract addresses from integration guide
        const contractAddresses = {
            aiNodeRegistry: '0x0045c7D99489f1d8A5900243956B0206344417DD',
            dloopToken: '0x05B366778566e93abfB8e4A9B794e4ad006446b4',
            soulboundNFT: '0x6391C14631b2Be5374297fA3110687b80233104c'
        };
        // Optimized contract ABIs with exact function signatures
        const aiNodeRegistryAbi = [
            'function registerNodeWithStaking(address nodeAddress, string memory metadata, uint256 stakeAmount) external',
            'function isNodeRegistered(address nodeAddress) external view returns (bool)',
            'function getNodeInfo(address nodeAddress) external view returns (tuple(address nodeAddress, string metadata, uint256 stakedAmount, bool isActive, uint256 registeredAt))',
            'function hasRole(bytes32 role, address account) external view returns (bool)',
            'function ADMIN_ROLE() external view returns (bytes32)',
            'function REGISTRAR_ROLE() external view returns (bytes32)'
        ];
        const dloopTokenAbi = [
            'function balanceOf(address owner) external view returns (uint256)',
            'function approve(address spender, uint256 amount) external returns (bool)',
            'function allowance(address owner, address spender) external view returns (uint256)',
            'function transfer(address to, uint256 amount) external returns (bool)'
        ];
        const soulboundNFTAbi = [
            'function balanceOf(address owner) external view returns (uint256)',
            'function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256)',
            'function hasRole(bytes32 role, address account) external view returns (bool)',
            'function ADMIN_ROLE() external view returns (bytes32)',
            'function MINTER_ROLE() external view returns (bytes32)'
        ];
        this.contracts.set('aiNodeRegistry', new ethers_1.ethers.Contract(contractAddresses.aiNodeRegistry, aiNodeRegistryAbi, provider));
        this.contracts.set('dloopToken', new ethers_1.ethers.Contract(contractAddresses.dloopToken, dloopTokenAbi, provider));
        this.contracts.set('soulboundNFT', new ethers_1.ethers.Contract(contractAddresses.soulboundNFT, soulboundNFTAbi, provider));
        this.logger.info('Smart contracts initialized with optimized ABIs');
    }
    /**
     * Check node prerequisites with enhanced validation
     */
    async checkNodePrerequisites(nodeConfig) {
        const provider = await this.getCurrentProvider();
        const wallet = new ethers_1.ethers.Wallet(nodeConfig.privateKey, provider);
        const dloopContract = this.contracts.get('dloopToken').connect(wallet);
        const soulboundContract = this.contracts.get('soulboundNFT');
        const registryContract = this.contracts.get('aiNodeRegistry');
        try {
            // Check token balance and approval
            const tokenBalance = await dloopContract.balanceOf(nodeConfig.address);
            const tokenApproval = await dloopContract.allowance(nodeConfig.address, '0x0045c7D99489f1d8A5900243956B0206344417DD');
            // Check SoulboundNFT balance
            const soulboundBalance = await soulboundContract.balanceOf(nodeConfig.address);
            // Check registration status
            let isRegistered = false;
            try {
                isRegistered = await registryContract.isNodeRegistered(nodeConfig.address);
            }
            catch (error) {
                // Node not registered
                isRegistered = false;
            }
            // Check role assignments
            const adminRole = await registryContract.ADMIN_ROLE();
            const hasRequiredRoles = await registryContract.hasRole(adminRole, nodeConfig.address);
            const ready = tokenBalance >= ethers_1.ethers.parseEther('1.0') &&
                tokenApproval >= ethers_1.ethers.parseEther('1.0') &&
                soulboundBalance > 0n &&
                hasRequiredRoles;
            this.logger.info(`Node ${nodeConfig.name} prerequisites:`, {
                tokenBalance: ethers_1.ethers.formatEther(tokenBalance),
                tokenApproval: ethers_1.ethers.formatEther(tokenApproval),
                soulboundBalance: soulboundBalance.toString(),
                isRegistered,
                hasRequiredRoles,
                ready
            });
            return {
                tokenBalance,
                tokenApproval,
                soulboundBalance,
                isRegistered,
                hasRequiredRoles,
                ready
            };
        }
        catch (error) {
            this.logger.error(`Failed to check prerequisites for ${nodeConfig.name}:`, error);
            throw error;
        }
    }
    /**
     * Execute optimized node registration with error resilience
     */
    async registerNode(nodeConfig) {
        try {
            // Check prerequisites
            const prerequisites = await this.checkNodePrerequisites(nodeConfig);
            if (prerequisites.isRegistered) {
                this.logger.info(`Node ${nodeConfig.name} is already registered`);
                return { success: true };
            }
            if (!prerequisites.ready) {
                const error = `Node ${nodeConfig.name} prerequisites not met`;
                this.logger.error(error);
                return { success: false, error };
            }
            // Get fresh provider and wallet
            const provider = await this.getCurrentProvider();
            const wallet = new ethers_1.ethers.Wallet(nodeConfig.privateKey, provider);
            const registryContract = this.contracts.get('aiNodeRegistry').connect(wallet);
            // Prepare metadata
            const metadata = JSON.stringify({
                name: nodeConfig.name,
                description: `Automated governance node using ${nodeConfig.strategy} strategy`,
                endpoint: 'https://d-loop.io/identity/identity.json',
                nodeType: 'governance',
                strategy: nodeConfig.strategy,
                version: '1.0.0',
                registeredAt: Date.now()
            });
            // Execute registration
            this.logger.info(`Registering ${nodeConfig.name} with optimized parameters`);
            const tx = await registryContract.registerNodeWithStaking(nodeConfig.address, metadata, ethers_1.ethers.parseEther('1.0'), {
                gasLimit: 500000,
                gasPrice: ethers_1.ethers.parseUnits('20', 'gwei')
            });
            this.logger.info(`Registration transaction submitted: ${tx.hash}`);
            const receipt = await tx.wait();
            if (receipt.status === 1) {
                this.logger.info(`${nodeConfig.name} registered successfully`);
                return { success: true, txHash: tx.hash };
            }
            else {
                const error = 'Transaction failed';
                this.logger.error(error);
                return { success: false, error };
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Registration failed for ${nodeConfig.name}:`, errorMessage);
            if (errorMessage.includes('0x06d919f2')) {
                return {
                    success: false,
                    error: 'Admin permissions required - custom error 0x06d919f2 resolved through role assignment'
                };
            }
            return { success: false, error: errorMessage };
        }
    }
    /**
     * Execute optimized registration for all nodes
     */
    async executeOptimizedRegistration() {
        this.logger.info('Starting optimized node registration system');
        const results = [];
        // Process nodes sequentially to avoid nonce conflicts
        for (const nodeConfig of this.nodeConfigs) {
            this.logger.info(`Processing ${nodeConfig.name}...`);
            try {
                const result = await this.registerNode(nodeConfig);
                results.push({
                    nodeName: nodeConfig.name,
                    success: result.success,
                    txHash: result.txHash,
                    error: result.error
                });
                // Brief delay between registrations
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            catch (error) {
                this.logger.error(`Failed to process ${nodeConfig.name}:`, error);
                results.push({
                    nodeName: nodeConfig.name,
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
        // Summary
        const successful = results.filter(r => r.success).length;
        const total = results.length;
        this.logger.info(`Registration Summary: ${successful}/${total} nodes registered successfully`);
        for (const result of results) {
            if (result.success) {
                this.logger.info(`✓ ${result.nodeName}: ${result.txHash || 'Already registered'}`);
            }
            else {
                this.logger.error(`✗ ${result.nodeName}: ${result.error}`);
            }
        }
        if (successful === total) {
            this.logger.info('All nodes registered successfully - system ready for production');
        }
        else {
            this.logger.warn('Some nodes failed registration - review errors above');
        }
    }
}
exports.OptimizedNodeRegistration = OptimizedNodeRegistration;
/**
 * Execute optimized node registration
 */
async function main() {
    try {
        const registrationSystem = new OptimizedNodeRegistration();
        await registrationSystem.executeOptimizedRegistration();
    }
    catch (error) {
        console.error('Optimized registration failed:', error);
        process.exit(1);
    }
}
if (require.main === module) {
    main();
}
//# sourceMappingURL=optimizedNodeRegistration.js.map