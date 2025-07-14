#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const ethers_1 = require("ethers");
const logger_js_1 = require("../utils/logger.js");
dotenv_1.default.config();
const SOULBOUND_NFT_CONTRACT = '0x6391C14631b2Be5374297fA3110687b80233104c';
const DEPLOYER_ADDRESS = '0x3639D1F746A977775522221f53D0B1eA5749b8b9';
const SOULBOUND_ABI = [
    "function ownerOf(uint256 tokenId) view returns (address)",
    "function tokenURI(uint256 tokenId) view returns (string)",
    "function balanceOf(address owner) view returns (uint256)"
];
class TokenAnalyzer {
    constructor() {
        const rpcUrls = [
            'https://ethereum-sepolia-rpc.publicnode.com',
            'https://sepolia.gateway.tenderly.co',
            'https://sepolia.infura.io/v3/ca485bd6567e4c5fb5693ee66a5885d8'
        ];
        this.provider = new ethers_1.ethers.JsonRpcProvider(rpcUrls[0]);
        this.contract = new ethers_1.ethers.Contract(SOULBOUND_NFT_CONTRACT, SOULBOUND_ABI, this.provider);
    }
    async analyzeTokenDistribution() {
        console.log('🔍 Analyzing SoulBound NFT Token Distribution\n');
        const tokenHolders = new Map();
        const tokenDetails = [];
        logger_js_1.contractLogger.info('Analyzing tokens 1-20...');
        for (let tokenId = 1; tokenId <= 20; tokenId++) {
            try {
                const [owner, uri] = await Promise.all([
                    this.contract.ownerOf(tokenId),
                    this.contract.tokenURI(tokenId).catch(() => 'N/A')
                ]);
                if (!tokenHolders.has(owner)) {
                    tokenHolders.set(owner, []);
                }
                tokenHolders.get(owner).push(tokenId);
                tokenDetails.push({ id: tokenId, owner, uri });
                logger_js_1.contractLogger.info(`Token ${tokenId}: ${owner}`, { tokenId, owner, uri });
            }
            catch (error) {
                logger_js_1.contractLogger.warn(`Token ${tokenId} does not exist or error occurred:`, error);
                break;
            }
        }
        console.log('\n=== TOKEN DISTRIBUTION ANALYSIS ===\n');
        console.log('📊 Token Holders Summary:');
        for (const [owner, tokens] of tokenHolders.entries()) {
            const isDeployer = owner.toLowerCase() === DEPLOYER_ADDRESS.toLowerCase();
            console.log(`  ${owner} ${isDeployer ? '(DEPLOYER)' : ''}`);
            console.log(`    📦 Tokens: ${tokens.join(', ')} (${tokens.length} total)`);
            console.log('');
        }
        console.log('🎫 Individual Token Details:');
        for (const token of tokenDetails) {
            console.log(`  Token #${token.id}:`);
            console.log(`    👤 Owner: ${token.owner}`);
            console.log(`    🔗 URI: ${token.uri}`);
            console.log('');
        }
        console.log('📈 Distribution Stats:');
        console.log(`  🎯 Total Tokens Found: ${tokenDetails.length}`);
        console.log(`  👥 Unique Holders: ${tokenHolders.size}`);
        console.log(`  🚀 Deployer Tokens: ${tokenHolders.get(DEPLOYER_ADDRESS)?.length || 0}`);
        const deployerTokens = tokenHolders.get(DEPLOYER_ADDRESS)?.length || 0;
        const tokensNeeded = 5;
        if (deployerTokens >= tokensNeeded) {
            console.log(`  ✅ Deployer has ${deployerTokens} tokens - sufficient for ${tokensNeeded} AI nodes`);
            console.log(`\n💡 Recommendation: Transfer existing tokens to AI governance nodes instead of minting new ones`);
            const deployerTokenList = tokenHolders.get(DEPLOYER_ADDRESS) || [];
            console.log(`\n🔄 Suggested Token Transfers:`);
            const nodeAddresses = [
                '0x0E354b735a6eee60726e6e3A431e3320Ba26ba45',
                '0xb1c25B40A79b7D046E539A9fbBB58789efFD0874',
                '0x65b1d03F5F2Ad4Ff036ea7AeEf5Ec07Db27a5C58',
                '0x766766f2815f835E4A0b1360833C7A15DDF2b72a',
                '0xA6fBf2dD68dB92dA309D6b82DAe2180d903a36FA'
            ];
            for (let i = 0; i < Math.min(tokensNeeded, deployerTokenList.length); i++) {
                console.log(`  - Transfer Token #${deployerTokenList[i]} → Node ${i + 1} (${nodeAddresses[i]})`);
            }
        }
        else {
            console.log(`  ⚠️  Deployer has ${deployerTokens} tokens - need to mint ${tokensNeeded - deployerTokens} more`);
        }
        console.log('\n');
    }
}
async function main() {
    try {
        const analyzer = new TokenAnalyzer();
        await analyzer.analyzeTokenDistribution();
    }
    catch (error) {
        logger_js_1.contractLogger.error('Token analysis failed:', error);
        console.error('❌ Analysis failed:', error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
}
if (require.main === module) {
    main();
}
//# sourceMappingURL=token-analysis.js.map