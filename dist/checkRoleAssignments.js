"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkRoleAssignments = checkRoleAssignments;
const ethers_1 = require("ethers");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
async function checkRoleAssignments() {
    console.log('CHECKING ROLE-BASED ACCESS CONTROL STATUS');
    console.log('========================================');
    const provider = new ethers_1.ethers.JsonRpcProvider('https://sepolia.gateway.tenderly.co');
    // Initialize wallets
    const soulboundAdmin = new ethers_1.ethers.Wallet(process.env.SOULBOUND_ADMIN_PRIVATE_KEY, provider);
    const adminRole = new ethers_1.ethers.Wallet(process.env.ADMIN_ROLE_PRIVATE_KEY, provider);
    console.log(`Soulbound Admin: ${soulboundAdmin.address}`);
    console.log(`Admin Role Target: ${adminRole.address}`);
    // SoulboundNFT contract
    const soulboundAbi = [
        'function hasRole(bytes32 role, address account) view returns (bool)',
        'function ADMIN_ROLE() view returns (bytes32)',
        'function MINTER_ROLE() view returns (bytes32)',
        'function DEFAULT_ADMIN_ROLE() view returns (bytes32)'
    ];
    const soulboundContract = new ethers_1.ethers.Contract('0x6391C14631b2Be5374297fA3110687b80233104c', soulboundAbi, provider);
    console.log('\nChecking Role Hashes:');
    try {
        const defaultAdminRole = await soulboundContract.DEFAULT_ADMIN_ROLE();
        const adminRoleHash = await soulboundContract.ADMIN_ROLE();
        const minterRoleHash = await soulboundContract.MINTER_ROLE();
        console.log(`DEFAULT_ADMIN_ROLE: ${defaultAdminRole}`);
        console.log(`ADMIN_ROLE: ${adminRoleHash}`);
        console.log(`MINTER_ROLE: ${minterRoleHash}`);
        console.log('\nChecking Current Role Assignments:');
        // Check soulbound admin roles
        const soulboundHasDefault = await soulboundContract.hasRole(defaultAdminRole, soulboundAdmin.address);
        const soulboundHasAdmin = await soulboundContract.hasRole(adminRoleHash, soulboundAdmin.address);
        const soulboundHasMinter = await soulboundContract.hasRole(minterRoleHash, soulboundAdmin.address);
        console.log(`\nSoulbound Admin (${soulboundAdmin.address}):`);
        console.log(`  Has DEFAULT_ADMIN_ROLE: ${soulboundHasDefault}`);
        console.log(`  Has ADMIN_ROLE: ${soulboundHasAdmin}`);
        console.log(`  Has MINTER_ROLE: ${soulboundHasMinter}`);
        // Check target admin roles
        const targetHasDefault = await soulboundContract.hasRole(defaultAdminRole, adminRole.address);
        const targetHasAdmin = await soulboundContract.hasRole(adminRoleHash, adminRole.address);
        const targetHasMinter = await soulboundContract.hasRole(minterRoleHash, adminRole.address);
        console.log(`\nTarget Admin (${adminRole.address}):`);
        console.log(`  Has DEFAULT_ADMIN_ROLE: ${targetHasDefault}`);
        console.log(`  Has ADMIN_ROLE: ${targetHasAdmin}`);
        console.log(`  Has MINTER_ROLE: ${targetHasMinter}`);
        console.log('\nRole Assignment Status:');
        if (targetHasAdmin && targetHasMinter) {
            console.log('✅ ROLE-BASED ACCESS CONTROL SUCCESSFULLY IMPLEMENTED!');
            console.log('Both ADMIN_ROLE and MINTER_ROLE have been assigned to ADMIN_ROLE_PRIVATE_KEY!');
        }
        else if (targetHasAdmin || targetHasMinter) {
            console.log('⚡ PARTIAL ROLE ASSIGNMENT COMPLETED');
            console.log(`ADMIN_ROLE: ${targetHasAdmin ? 'ASSIGNED' : 'PENDING'}`);
            console.log(`MINTER_ROLE: ${targetHasMinter ? 'ASSIGNED' : 'PENDING'}`);
        }
        else {
            console.log('⏳ ROLE ASSIGNMENT IN PROGRESS');
            console.log('Transactions may still be processing on the blockchain');
        }
        // Check wallet balances
        const adminBalance = await provider.getBalance(soulboundAdmin.address);
        const targetBalance = await provider.getBalance(adminRole.address);
        const blockNumber = await provider.getBlockNumber();
        console.log('\nWallet Status:');
        console.log(`Current block: ${blockNumber}`);
        console.log(`Soulbound admin balance: ${ethers_1.ethers.formatEther(adminBalance)} ETH`);
        console.log(`Target admin balance: ${ethers_1.ethers.formatEther(targetBalance)} ETH`);
        console.log('\nSystem Status:');
        console.log('✓ SoulboundNFT contract operational');
        console.log('✓ Role verification functions working');
        console.log('✓ Network connectivity stable');
        console.log('✓ Wallet integration successful');
    }
    catch (error) {
        console.error(`Role check failed: ${error.message}`);
    }
}
async function main() {
    await checkRoleAssignments();
}
if (require.main === module) {
    main().catch(console.error);
}
//# sourceMappingURL=checkRoleAssignments.js.map