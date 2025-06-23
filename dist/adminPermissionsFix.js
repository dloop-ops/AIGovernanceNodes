"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveAdminPermissions = resolveAdminPermissions;
const ethers_1 = require("ethers");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
/**
 * Admin Permissions Fix for Custom Error 0x06d919f2
 * Grants necessary roles to resolve node registration blocking error
 */
async function resolveAdminPermissions() {
    console.log('Starting Admin Permissions Resolution...');
    // Initialize provider
    const provider = new ethers_1.ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL);
    // Initialize admin wallet
    const adminWallet = new ethers_1.ethers.Wallet(process.env.SOULBOUND_ADMIN_PRIVATE_KEY, provider);
    const targetWallet = new ethers_1.ethers.Wallet(process.env.AI_NODE_1_PRIVATE_KEY, provider);
    console.log(`Admin Wallet: ${adminWallet.address}`);
    console.log(`Target Wallet: ${targetWallet.address}`);
    // Contract addresses
    const SOULBOUND_NFT_ADDRESS = '0x6391C14631b2Be5374297fA3110687b80233104c';
    const AI_NODE_REGISTRY_ADDRESS = '0x0045c7D99489f1d8A5900243956B0206344417DD';
    // Role hashes
    const ADMIN_ROLE = ethers_1.ethers.keccak256(ethers_1.ethers.toUtf8Bytes('ADMIN_ROLE'));
    const MINTER_ROLE = ethers_1.ethers.keccak256(ethers_1.ethers.toUtf8Bytes('MINTER_ROLE'));
    const REGISTRAR_ROLE = ethers_1.ethers.keccak256(ethers_1.ethers.toUtf8Bytes('REGISTRAR_ROLE'));
    // Contract ABIs
    const accessControlAbi = [
        'function hasRole(bytes32 role, address account) external view returns (bool)',
        'function grantRole(bytes32 role, address account) external',
        'function revokeRole(bytes32 role, address account) external'
    ];
    // Initialize contracts
    const soulboundNFT = new ethers_1.ethers.Contract(SOULBOUND_NFT_ADDRESS, accessControlAbi, adminWallet);
    const aiNodeRegistry = new ethers_1.ethers.Contract(AI_NODE_REGISTRY_ADDRESS, accessControlAbi, adminWallet);
    try {
        console.log('\nGranting SoulboundNFT roles...');
        // Grant ADMIN_ROLE on SoulboundNFT
        const hasAdminRole = await soulboundNFT.hasRole(ADMIN_ROLE, targetWallet.address);
        if (!hasAdminRole) {
            console.log('Granting ADMIN_ROLE on SoulboundNFT...');
            const tx1 = await soulboundNFT.grantRole(ADMIN_ROLE, targetWallet.address, { gasLimit: 200000 });
            await tx1.wait();
            console.log(`ADMIN_ROLE granted: ${tx1.hash}`);
        }
        else {
            console.log('ADMIN_ROLE already granted on SoulboundNFT');
        }
        // Grant MINTER_ROLE on SoulboundNFT
        const hasMinterRole = await soulboundNFT.hasRole(MINTER_ROLE, targetWallet.address);
        if (!hasMinterRole) {
            console.log('Granting MINTER_ROLE on SoulboundNFT...');
            const tx2 = await soulboundNFT.grantRole(MINTER_ROLE, targetWallet.address, { gasLimit: 200000 });
            await tx2.wait();
            console.log(`MINTER_ROLE granted: ${tx2.hash}`);
        }
        else {
            console.log('MINTER_ROLE already granted on SoulboundNFT');
        }
        console.log('\nGranting AINodeRegistry roles...');
        // Grant ADMIN_ROLE on AINodeRegistry
        const hasRegistryAdminRole = await aiNodeRegistry.hasRole(ADMIN_ROLE, targetWallet.address);
        if (!hasRegistryAdminRole) {
            console.log('Granting ADMIN_ROLE on AINodeRegistry...');
            const tx3 = await aiNodeRegistry.grantRole(ADMIN_ROLE, targetWallet.address, { gasLimit: 200000 });
            await tx3.wait();
            console.log(`ADMIN_ROLE granted: ${tx3.hash}`);
        }
        else {
            console.log('ADMIN_ROLE already granted on AINodeRegistry');
        }
        // Grant REGISTRAR_ROLE on AINodeRegistry
        const hasRegistrarRole = await aiNodeRegistry.hasRole(REGISTRAR_ROLE, targetWallet.address);
        if (!hasRegistrarRole) {
            console.log('Granting REGISTRAR_ROLE on AINodeRegistry...');
            const tx4 = await aiNodeRegistry.grantRole(REGISTRAR_ROLE, targetWallet.address, { gasLimit: 200000 });
            await tx4.wait();
            console.log(`REGISTRAR_ROLE granted: ${tx4.hash}`);
        }
        else {
            console.log('REGISTRAR_ROLE already granted on AINodeRegistry');
        }
        console.log('\nAdmin permissions resolution completed successfully');
        console.log('Custom error 0x06d919f2 should now be resolved');
    }
    catch (error) {
        console.error('Error resolving admin permissions:', error);
        throw error;
    }
}
/**
 * Execute admin permissions fix
 */
async function main() {
    try {
        await resolveAdminPermissions();
    }
    catch (error) {
        console.error('Failed to resolve admin permissions:', error);
        process.exit(1);
    }
}
if (require.main === module) {
    main();
}
//# sourceMappingURL=adminPermissionsFix.js.map