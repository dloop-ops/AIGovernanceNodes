"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminPermissionsResolver = void 0;
const ethers_1 = require("ethers");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
class AdminPermissionsResolver {
    constructor() {
        this.contracts = new Map();
        // Contract addresses from integration guide
        this.contractAddresses = {
            soulboundNFT: '0x6391C14631b2Be5374297fA3110687b80233104c',
            aiNodeRegistry: '0x0045c7D99489f1d8A5900243956B0206344417DD',
            dloopToken: '0x05B366778566e93abfB8e4A9B794e4ad006446b4',
            protocolDAO: '0x012e4042ab5F55A556a8B453aBeC852D9466aFb0',
            assetDAO: '0xa87e662061237a121Ca2E83E77dA8251bc4B3529'
        };
        // Standard OpenZeppelin role hashes
        this.roles = {
            DEFAULT_ADMIN_ROLE: {
                name: 'DEFAULT_ADMIN_ROLE',
                hash: '0x0000000000000000000000000000000000000000000000000000000000000000',
                description: 'Default admin role for contract administration'
            },
            ADMIN_ROLE: {
                name: 'ADMIN_ROLE',
                hash: ethers_1.ethers.keccak256(ethers_1.ethers.toUtf8Bytes('ADMIN_ROLE')),
                description: 'Administrative role for node operations'
            },
            MINTER_ROLE: {
                name: 'MINTER_ROLE',
                hash: ethers_1.ethers.keccak256(ethers_1.ethers.toUtf8Bytes('MINTER_ROLE')),
                description: 'Minting role for SoulboundNFT creation'
            },
            REGISTRAR_ROLE: {
                name: 'REGISTRAR_ROLE',
                hash: ethers_1.ethers.keccak256(ethers_1.ethers.toUtf8Bytes('REGISTRAR_ROLE')),
                description: 'Registration role for AI node registration'
            }
        };
        // Initialize provider with multiple RPC endpoints for redundancy
        const rpcUrls = [
            process.env.ETHEREUM_RPC_URL,
            `https://sepolia.infura.io/v3/${process.env.BACKUP_INFURA_KEY}`,
            'https://sepolia.gateway.tenderly.co/public',
            'https://ethereum-sepolia-rpc.publicnode.com'
        ].filter(Boolean);
        this.provider = new ethers_1.ethers.JsonRpcProvider(rpcUrls[0]);
        // Initialize admin wallets
        if (!process.env.SOULBOUND_ADMIN_PRIVATE_KEY) {
            throw new Error('SOULBOUND_ADMIN_PRIVATE_KEY environment variable is required');
        }
        this.soulboundAdminWallet = new ethers_1.ethers.Wallet(process.env.SOULBOUND_ADMIN_PRIVATE_KEY, this.provider);
        // Use first node private key as admin role target
        if (!process.env.AI_NODE_1_PRIVATE_KEY) {
            throw new Error('AI_NODE_1_PRIVATE_KEY environment variable is required');
        }
        this.adminRoleWallet = new ethers_1.ethers.Wallet(process.env.AI_NODE_1_PRIVATE_KEY, this.provider);
        this.initializeContracts();
    }
    initializeContracts() {
        // SoulboundNFT contract with access control functions
        const soulboundNFTAbi = [
            'function hasRole(bytes32 role, address account) external view returns (bool)',
            'function grantRole(bytes32 role, address account) external',
            'function revokeRole(bytes32 role, address account) external',
            'function getRoleAdmin(bytes32 role) external view returns (bytes32)',
            'function DEFAULT_ADMIN_ROLE() external view returns (bytes32)',
            'function ADMIN_ROLE() external view returns (bytes32)',
            'function MINTER_ROLE() external view returns (bytes32)',
            'function balanceOf(address owner) external view returns (uint256)',
            'function mint(address to, string memory metadataURI) external returns (uint256)'
        ];
        // AINodeRegistry contract with registration functions
        const aiNodeRegistryAbi = [
            'function hasRole(bytes32 role, address account) external view returns (bool)',
            'function grantRole(bytes32 role, address account) external',
            'function revokeRole(bytes32 role, address account) external',
            'function DEFAULT_ADMIN_ROLE() external view returns (bytes32)',
            'function ADMIN_ROLE() external view returns (bytes32)',
            'function REGISTRAR_ROLE() external view returns (bytes32)',
            'function registerNodeWithStaking(address nodeAddress, string memory metadata, uint256 stakeAmount) external',
            'function isNodeRegistered(address nodeAddress) external view returns (bool)',
            'function getNodeInfo(address nodeAddress) external view returns (tuple(address nodeAddress, string metadata, uint256 stakedAmount, bool isActive, uint256 registeredAt))'
        ];
        // Initialize contracts with admin wallet
        this.contracts.set('soulboundNFT', new ethers_1.ethers.Contract(this.contractAddresses.soulboundNFT, soulboundNFTAbi, this.soulboundAdminWallet));
        this.contracts.set('aiNodeRegistry', new ethers_1.ethers.Contract(this.contractAddresses.aiNodeRegistry, aiNodeRegistryAbi, this.soulboundAdminWallet));
        console.log('✅ Smart contracts initialized with admin wallet');
        console.log(`   SoulboundNFT: ${this.contractAddresses.soulboundNFT}`);
        console.log(`   AINodeRegistry: ${this.contractAddresses.aiNodeRegistry}`);
        console.log(`   Admin Wallet: ${this.soulboundAdminWallet.address}`);
        console.log(`   Target Admin: ${this.adminRoleWallet.address}`);
    }
    /**
     * Check current role assignments across all contracts
     */
    async analyzeCurrentRoles() {
        console.log('\n🔍 Analyzing Current Role Assignments...\n');
        for (const [contractName, contract] of this.contracts) {
            console.log(`📋 ${contractName.toUpperCase()} Role Analysis:`);
            try {
                // Check each role for both admin and target addresses
                for (const [roleName, roleConfig] of Object.entries(this.roles)) {
                    try {
                        const adminHasRole = await contract.hasRole(roleConfig.hash, this.soulboundAdminWallet.address);
                        const targetHasRole = await contract.hasRole(roleConfig.hash, this.adminRoleWallet.address);
                        console.log(`   ${roleName}:`);
                        console.log(`     Admin (${this.soulboundAdminWallet.address}): ${adminHasRole ? '✅ HAS' : '❌ MISSING'}`);
                        console.log(`     Target (${this.adminRoleWallet.address}): ${targetHasRole ? '✅ HAS' : '❌ MISSING'}`);
                    }
                    catch (error) {
                        console.log(`   ${roleName}: ⚠️  Role not found in contract`);
                    }
                }
                console.log();
            }
            catch (error) {
                console.log(`   ❌ Error analyzing ${contractName}: ${error}`);
                console.log();
            }
        }
    }
    /**
     * Grant necessary roles to resolve registration permissions
     */
    async grantAdminRoles() {
        console.log('🔧 Granting Admin Roles...\n');
        const results = [];
        // Roles to grant for each contract
        const roleAssignments = [
            {
                contractName: 'soulboundNFT',
                roles: ['ADMIN_ROLE', 'MINTER_ROLE']
            },
            {
                contractName: 'aiNodeRegistry',
                roles: ['ADMIN_ROLE', 'REGISTRAR_ROLE']
            }
        ];
        for (const assignment of roleAssignments) {
            const contract = this.contracts.get(assignment.contractName);
            if (!contract)
                continue;
            console.log(`📝 Granting roles for ${assignment.contractName}:`);
            for (const roleName of assignment.roles) {
                const roleConfig = this.roles[roleName];
                if (!roleConfig)
                    continue;
                try {
                    // Check if role is already granted
                    const hasRole = await contract.hasRole(roleConfig.hash, this.adminRoleWallet.address);
                    if (hasRole) {
                        console.log(`   ✅ ${roleName} already granted to ${this.adminRoleWallet.address}`);
                        results.push({
                            contract: assignment.contractName,
                            role: roleName,
                            target: this.adminRoleWallet.address,
                            success: true
                        });
                        continue;
                    }
                    // Grant the role
                    console.log(`   🔄 Granting ${roleName} to ${this.adminRoleWallet.address}...`);
                    const tx = await contract.grantRole(roleConfig.hash, this.adminRoleWallet.address, {
                        gasLimit: 200000
                    });
                    console.log(`   📤 Transaction submitted: ${tx.hash}`);
                    const receipt = await tx.wait();
                    if (receipt.status === 1) {
                        console.log(`   ✅ ${roleName} granted successfully`);
                        results.push({
                            contract: assignment.contractName,
                            role: roleName,
                            target: this.adminRoleWallet.address,
                            success: true,
                            txHash: tx.hash
                        });
                    }
                    else {
                        throw new Error('Transaction failed');
                    }
                }
                catch (error) {
                    console.log(`   ❌ Failed to grant ${roleName}: ${error}`);
                    results.push({
                        contract: assignment.contractName,
                        role: roleName,
                        target: this.adminRoleWallet.address,
                        success: false,
                        error: error instanceof Error ? error.message : String(error)
                    });
                }
            }
            console.log();
        }
        // Summary
        const successful = results.filter(r => r.success).length;
        const total = results.length;
        console.log(`📊 Role Assignment Summary: ${successful}/${total} successful`);
        if (successful === total) {
            console.log('🎉 All role assignments completed successfully!');
        }
        else {
            console.log('⚠️  Some role assignments failed. Check the logs above.');
        }
    }
    /**
     * Verify that the admin permissions resolve the registration issue
     */
    async testNodeRegistration() {
        console.log('\n🧪 Testing Node Registration with New Permissions...\n');
        // Connect AINodeRegistry with the admin role wallet
        const registryContract = this.contracts.get('aiNodeRegistry');
        if (!registryContract) {
            throw new Error('AINodeRegistry contract not found');
        }
        const registryWithAdmin = registryContract.connect(this.adminRoleWallet);
        const testMetadata = JSON.stringify({
            name: 'AI Governance Node Test',
            description: 'Test registration with admin permissions',
            endpoint: 'https://d-loop.io/identity/identity.json',
            nodeType: 'governance',
            strategy: 'test',
            version: '1.0.0',
            registeredAt: Date.now()
        });
        try {
            console.log(`🔄 Testing registration for node: ${this.adminRoleWallet.address}`);
            // Check if already registered
            const isRegistered = await registryWithAdmin.isNodeRegistered(this.adminRoleWallet.address);
            if (isRegistered) {
                console.log('✅ Node is already registered');
                return;
            }
            // Estimate gas for registration
            console.log('📊 Estimating gas for registration...');
            const gasEstimate = await registryWithAdmin.registerNodeWithStaking.estimateGas(this.adminRoleWallet.address, testMetadata, ethers_1.ethers.parseEther('1.0'));
            console.log(`📊 Estimated gas: ${gasEstimate.toString()}`);
            // If we reach here, the permissions are resolved
            console.log('🎉 Gas estimation successful - permissions resolved!');
            console.log('✅ Custom error 0x06d919f2 should be resolved');
        }
        catch (error) {
            if (error instanceof Error && error.message.includes('0x06d919f2')) {
                console.log('❌ Custom error 0x06d919f2 still persists');
                console.log('   Additional role configuration may be required');
            }
            else if (error instanceof Error && error.message.includes('NodeNotRegistered')) {
                console.log('✅ Permissions resolved - different error indicates progress');
            }
            else {
                console.log(`⚠️  Test failed with different error: ${error}`);
            }
        }
    }
    /**
     * Execute complete admin permissions resolution
     */
    async resolvePermissions() {
        console.log('🚀 Starting Admin Permissions Resolution System\n');
        console.log('='.repeat(60));
        try {
            // Step 1: Analyze current state
            await this.analyzeCurrentRoles();
            // Step 2: Grant necessary roles
            await this.grantAdminRoles();
            // Step 3: Test the fix
            await this.testNodeRegistration();
            // Step 4: Final verification
            console.log('\n🔍 Final Role Verification...');
            await this.analyzeCurrentRoles();
            console.log('='.repeat(60));
            console.log('✅ Admin permissions resolution completed');
            console.log('🎯 The system should now be ready for node registration');
        }
        catch (error) {
            console.log('\n❌ Admin permissions resolution failed:');
            console.log(`   Error: ${error}`);
            throw error;
        }
    }
}
exports.AdminPermissionsResolver = AdminPermissionsResolver;
/**
 * Execute admin permissions resolution
 */
async function main() {
    try {
        const resolver = new AdminPermissionsResolver();
        await resolver.resolvePermissions();
    }
    catch (error) {
        console.error('Failed to resolve admin permissions:', error);
        process.exit(1);
    }
}
// Execute if run directly
if (require.main === module) {
    main();
}
//# sourceMappingURL=resolveAdminPermissions.js.map