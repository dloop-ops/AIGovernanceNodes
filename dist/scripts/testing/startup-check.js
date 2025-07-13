import { ethers } from 'ethers';
console.log('🔍 STARTUP ENVIRONMENT CHECK');
console.log('===========================');
// Check environment variables
const requiredVars = [
    'AI_NODE_1_PRIVATE_KEY',
    'AI_NODE_2_PRIVATE_KEY',
    'AI_NODE_3_PRIVATE_KEY',
    'AI_NODE_4_PRIVATE_KEY',
    'AI_NODE_5_PRIVATE_KEY'
];
let missingVars = [];
for (const varName of requiredVars) {
    if (!process.env[varName]) {
        missingVars.push(varName);
    }
}
if (missingVars.length > 0) {
    console.log('❌ Missing environment variables:', missingVars.join(', '));
    process.exit(1);
}
console.log('✅ All required private keys are present');
// Check RPC connectivity with very conservative approach
const rpcUrl = process.env.ETHEREUM_RPC_URL || 'https://sepolia.infura.io/v3/ca485bd6567e4c5fb5693ee66a5885d8';
console.log(`🔗 Testing RPC connectivity: ${rpcUrl.replace(/\/v3\/.*/, '/v3/***')}`);
try {
    // Add delay before any network call
    await new Promise(resolve => setTimeout(resolve, 2000));
    const provider = new ethers.JsonRpcProvider(rpcUrl, {
        name: 'sepolia',
        chainId: 11155111
    });
    // Test with timeout
    const blockNumber = await Promise.race([
        provider.getBlockNumber(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), 10000))
    ]);
    console.log(`✅ RPC connection successful! Latest block: ${blockNumber}`);
    console.log('🚀 Environment check passed - ready to start');
}
catch (error) {
    console.log('❌ RPC connection failed:', error.message);
    console.log('⚠️ Will attempt to start anyway with fallback endpoints');
}
process.exit(0);
//# sourceMappingURL=startup-check.js.map