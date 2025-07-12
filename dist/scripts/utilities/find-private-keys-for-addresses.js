!/usr/bin / env;
node;
import { ethers } from 'ethers';
/**
 * Governance node addresses that need corresponding private keys
 */
const TARGET_ADDRESSES = [
    { nodeId: "ai-gov-01", address: "0x561529036AB886c1FD3D112360383D79fBA9E71c" },
    { nodeId: "ai-gov-02", address: "0x48B2353954496679CF7C73d239bc12098cB0C5B4" },
    { nodeId: "ai-gov-03", address: "0x43f76157E9696302E287181828cB3B0C6B89d31e" },
    { nodeId: "ai-gov-04", address: "0xC02764913ce2F23B094F0338a711EFD984024A46" },
    { nodeId: "ai-gov-05", address: "0x00FfF703fa6837A1a46b3DF9B6a047404046379E" }
];
/**
 * Current private keys from environment
 */
const CURRENT_PRIVATE_KEYS = [
    "0xa1b2c3d4e5f6789012345678901234567890123456789012345678901234abcd",
    "0xb2c3d4e5f6789012345678901234567890123456789012345678901234bcde1",
    "0xc3d4e5f6789012345678901234567890123456789012345678901234cdef12",
    "0xd4e5f6789012345678901234567890123456789012345678901234def123a4",
    "0xe5f6789012345678901234567890123456789012345678901234ef123a4b5"
];
/**
 * Generate public keys from current private keys
 */
function getCurrentAddresses() {
    console.log('\n🔑 Current Private Keys → Public Addresses:');
    console.log('==========================================\n');
    CURRENT_PRIVATE_KEYS.forEach((privateKey, index) => {
        try {
            const wallet = new ethers.Wallet(privateKey);
            console.log(`AI_NODE_${index + 1}:`);
            console.log(`  Private Key: ${privateKey}`);
            console.log(`  Public Address: ${wallet.address}`);
            console.log('');
        }
        catch (error) {
            console.error(`❌ Error with private key ${index + 1}:`, error);
        }
    });
}
/**
 * Check if any current private keys match target addresses
 */
function checkForMatches() {
    console.log('\n🎯 Checking for Address Matches:');
    console.log('================================\n');
    const currentAddresses = CURRENT_PRIVATE_KEYS.map(pk => {
        try {
            return new ethers.Wallet(pk).address.toLowerCase();
        }
        catch {
            return null;
        }
    }).filter(Boolean);
    TARGET_ADDRESSES.forEach(target => {
        const isMatch = currentAddresses.includes(target.address.toLowerCase());
        console.log(`${target.nodeId} (${target.address}): ${isMatch ? '✅ MATCH FOUND' : '❌ NO MATCH'}`);
    });
}
/**
 * Generate new private keys for the target addresses (if they were derived deterministically)
 * Note: In reality, you cannot derive private keys from public addresses
 */
function analyzeTargetAddresses() {
    console.log('\n📋 Target Governance Node Addresses:');
    console.log('===================================\n');
    TARGET_ADDRESSES.forEach(target => {
        console.log(`${target.nodeId}:`);
        console.log(`  Required Address: ${target.address}`);
        console.log(`  Status: Private key needed for this address`);
        console.log('');
    });
    console.log('⚠️  Note: Private keys cannot be derived from public addresses.');
    console.log('   You need to either:');
    console.log('   1. Have the original private keys for these addresses');
    console.log('   2. Generate new addresses and update the governance system');
    console.log('   3. Import existing wallets that control these addresses');
}
/**
 * Generate new governance node wallets as alternative
 */
function generateNewWallets() {
    console.log('\n🆕 Alternative: Generate New Governance Wallets:');
    console.log('===============================================\n');
    for (let i = 1; i <= 5; i++) {
        const wallet = ethers.Wallet.createRandom();
        console.log(`AI_NODE_${i}_PRIVATE_KEY=${wallet.privateKey}`);
    }
    console.log('\n💡 These new wallets can be used if you can update the governance system');
    console.log('   to use different addresses than the ones specified.');
}
/**
 * Main execution
 */
function main() {
    console.log('🔍 Private Key Analysis for Governance Nodes');
    console.log('===========================================');
    // Show current configuration
    getCurrentAddresses();
    // Check for matches
    checkForMatches();
    // Analyze target addresses
    analyzeTargetAddresses();
    // Generate alternatives
    generateNewWallets();
    console.log('\n📝 Next Steps:');
    console.log('=============');
    console.log('1. If you have the private keys for the target addresses, update .env');
    console.log('2. If not, you may need to update the governance system configuration');
    console.log('3. Contact the team that originally generated these addresses');
    console.log('4. Consider using the current working private keys if addresses can be changed');
}
// Run the analysis
if (require.main === module) {
    main();
}
export { TARGET_ADDRESSES, CURRENT_PRIVATE_KEYS };
