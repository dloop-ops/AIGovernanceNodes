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
exports.finalRoleAssignment = finalRoleAssignment;
const ethers_1 = require("ethers");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
async function finalRoleAssignment() {
    console.log('FINAL ROLE ASSIGNMENT IMPLEMENTATION');
    console.log('===================================');
    const provider = new ethers_1.ethers.JsonRpcProvider('https://sepolia.gateway.tenderly.co');
    const soulboundAdmin = new ethers_1.ethers.Wallet(process.env.SOULBOUND_ADMIN_PRIVATE_KEY, provider);
    const adminRoleTarget = new ethers_1.ethers.Wallet(process.env.ADMIN_ROLE_PRIVATE_KEY, provider);
    console.log(`Using SOULBOUND_ADMIN_PRIVATE_KEY: ${soulboundAdmin.address}`);
    console.log(`Assigning roles to ADMIN_ROLE_PRIVATE_KEY: ${adminRoleTarget.address}`);
    const soulboundAbi = [
        'function hasRole(bytes32 role, address account) view returns (bool)',
        'function grantRole(bytes32 role, address account) external',
        'function ADMIN_ROLE() view returns (bytes32)',
        'function MINTER_ROLE() view returns (bytes32)'
    ];
    const soulboundContract = new ethers_1.ethers.Contract('0x6391C14631b2Be5374297fA3110687b80233104c', soulboundAbi, soulboundAdmin);
    const adminRoleHash = await soulboundContract.ADMIN_ROLE();
    const minterRoleHash = await soulboundContract.MINTER_ROLE();
    console.log(`ADMIN_ROLE hash: ${adminRoleHash}`);
    console.log(`MINTER_ROLE hash: ${minterRoleHash}`);
    // Check current status
    const hasAdminRole = await soulboundContract.hasRole(adminRoleHash, adminRoleTarget.address);
    const hasMinterRole = await soulboundContract.hasRole(minterRoleHash, adminRoleTarget.address);
    console.log(`\nCurrent status:`);
    console.log(`Target has ADMIN_ROLE: ${hasAdminRole}`);
    console.log(`Target has MINTER_ROLE: ${hasMinterRole}`);
    let successCount = 0;
    // Grant ADMIN_ROLE
    if (!hasAdminRole) {
        console.log('\nGranting ADMIN_ROLE...');
        try {
            const tx1 = await soulboundContract.grantRole(adminRoleHash, adminRoleTarget.address, {
                gasLimit: 120000,
                maxFeePerGas: ethers_1.ethers.parseUnits('25', 'gwei'),
                maxPriorityFeePerGas: ethers_1.ethers.parseUnits('2', 'gwei')
            });
            console.log(`ADMIN_ROLE transaction: ${tx1.hash}`);
            const receipt1 = await tx1.wait(3);
            if (receipt1?.status === 1) {
                console.log('✓ ADMIN_ROLE granted successfully');
                successCount++;
            }
            else {
                console.log('✗ ADMIN_ROLE transaction failed');
            }
        }
        catch (error) {
            console.log(`✗ ADMIN_ROLE error: ${error.message}`);
        }
    }
    else {
        console.log('✓ ADMIN_ROLE already assigned');
        successCount++;
    }
    // Wait before next transaction
    await new Promise(resolve => setTimeout(resolve, 8000));
    // Grant MINTER_ROLE
    if (!hasMinterRole) {
        console.log('\nGranting MINTER_ROLE...');
        try {
            const tx2 = await soulboundContract.grantRole(minterRoleHash, adminRoleTarget.address, {
                gasLimit: 120000,
                maxFeePerGas: ethers_1.ethers.parseUnits('25', 'gwei'),
                maxPriorityFeePerGas: ethers_1.ethers.parseUnits('2', 'gwei')
            });
            console.log(`MINTER_ROLE transaction: ${tx2.hash}`);
            const receipt2 = await tx2.wait(3);
            if (receipt2?.status === 1) {
                console.log('✓ MINTER_ROLE granted successfully');
                successCount++;
            }
            else {
                console.log('✗ MINTER_ROLE transaction failed');
            }
        }
        catch (error) {
            console.log(`✗ MINTER_ROLE error: ${error.message}`);
        }
    }
    else {
        console.log('✓ MINTER_ROLE already assigned');
        successCount++;
    }
    // Final verification
    console.log('\nFinal verification...');
    await new Promise(resolve => setTimeout(resolve, 12000));
    try {
        const finalAdminRole = await soulboundContract.hasRole(adminRoleHash, adminRoleTarget.address);
        const finalMinterRole = await soulboundContract.hasRole(minterRoleHash, adminRoleTarget.address);
        console.log(`\nFinal Role Status:`);
        console.log(`ADMIN_ROLE assigned: ${finalAdminRole}`);
        console.log(`MINTER_ROLE assigned: ${finalMinterRole}`);
        if (finalAdminRole && finalMinterRole) {
            console.log('\n🎉 ROLE-BASED ACCESS CONTROL SUCCESSFULLY IMPLEMENTED!');
            console.log('SOULBOUND_ADMIN_PRIVATE_KEY has successfully assigned both roles to ADMIN_ROLE_PRIVATE_KEY!');
            console.log('DLoop AI Governance Node software is now ready with proper role-based access control!');
        }
        else {
            console.log('\n⚠️ Role assignment verification incomplete');
            console.log('Some roles may still be processing or require retry');
        }
        console.log(`\nImplementation Summary:`);
        console.log(`- SOULBOUND_ADMIN_PRIVATE_KEY (${soulboundAdmin.address}): Used for role assignment authority`);
        console.log(`- ADMIN_ROLE_PRIVATE_KEY (${adminRoleTarget.address}): Target for role assignment`);
        console.log(`- ADMIN_ROLE: ${finalAdminRole ? 'ASSIGNED' : 'PENDING'}`);
        console.log(`- MINTER_ROLE: ${finalMinterRole ? 'ASSIGNED' : 'PENDING'}`);
        console.log(`- Successful transactions: ${successCount}/2`);
    }
    catch (error) {
        console.log(`Verification error: ${error.message}`);
    }
}
async function main() {
    await finalRoleAssignment();
}
if (require.main === module) {
    main().catch(console.error);
}
//# sourceMappingURL=finalRoleAssignment.js.map