"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ethers_1 = require("ethers");
async function testRpcConnections() {
    console.log('🔍 DLoop AI Governance Nodes - Connection Diagnostic');
    console.log('=====================================================');
    const providers = [
        {
            name: 'Primary RPC (from env)',
            url: process.env.ETHEREUM_RPC_URL
        },
        {
            name: 'PublicNode',
            url: 'https://ethereum-sepolia-rpc.publicnode.com'
        },
        {
            name: 'Sepolia.org',
            url: 'https://rpc.sepolia.org'
        },
        {
            name: 'Tenderly',
            url: 'https://sepolia.gateway.tenderly.co'
        },
        {
            name: 'RockX',
            url: 'https://rpc-sepolia.rockx.com'
        }
    ];
    let workingProviders = 0;
    for (const config of providers) {
        if (!config.url) {
            console.log(`❌ ${config.name}: URL not configured`);
            continue;
        }
        try {
            console.log(`🔄 Testing ${config.name}...`);
            const provider = new ethers_1.ethers.JsonRpcProvider(config.url);
            const startTime = Date.now();
            const [blockNumber, network] = await Promise.all([
                Promise.race([
                    provider.getBlockNumber(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 8000))
                ]),
                Promise.race([
                    provider.getNetwork(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Network timeout')), 8000))
                ])
            ]);
            const responseTime = Date.now() - startTime;
            if (Number(network.chainId) !== 11155111) {
                console.log(`❌ ${config.name}: Wrong network (${network.chainId}, expected 11155111)`);
                continue;
            }
            console.log(`✅ ${config.name}: Block ${blockNumber}, ${responseTime}ms`);
            workingProviders++;
        }
        catch (error) {
            console.log(`❌ ${config.name}: ${error.message.substring(0, 60)}...`);
        }
    }
    console.log('\n📊 Summary:');
    console.log(`   Working providers: ${workingProviders}/${providers.length}`);
    if (workingProviders === 0) {
        console.log('\n🚨 NO WORKING PROVIDERS FOUND!');
        console.log('   Possible issues:');
        console.log('   - Internet connection problems');
        console.log('   - Firewall blocking outbound HTTPS');
        console.log('   - All RPC providers are down (unlikely)');
        console.log('   - Environment variable ETHEREUM_RPC_URL not set or invalid');
        process.exit(1);
    }
    else {
        console.log('\n✅ Connection test passed');
    }
}
testRpcConnections().catch(error => {
    console.error('❌ Diagnostic failed:', error.message);
    process.exit(1);
});
//# sourceMappingURL=connection-diagnostic.js.map