#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SoulboundInvestigator = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const ethers_1 = require("ethers");
const axios_1 = __importDefault(require("axios"));
const logger_js_1 = require("../utils/logger.js");
dotenv_1.default.config();
const SEPOLIA_CHAIN_ID = 11155111;
const ETHERSCAN_API_KEY = 'HG7DAYXKN5B6AZE35WRDVQRSNN5IDC3ZG6';
const SOULBOUND_NFT_CONTRACT = '0x6391C14631b2Be5374297fA3110687b80233104c';
const DEPLOYER_ADDRESS = '0x3639D1F746A977775522221f53D0B1eA5749b8b9';
const NODE_ADDRESSES = [
    '0x0E354b735a6eee60726e6e3A431e3320Ba26ba45',
    '0xb1c25B40A79b7D046E539A9fbBB58789efFD0874',
    '0x65b1d03F5F2Ad4Ff036ea7AeEf5Ec07Db27a5C58',
    '0x766766f2815f835E4A0b1360833C7A15DDF2b72a',
    '0xA6fBf2dD68dB92dA309D6b82DAe2180d903a36FA'
];
const SOULBOUND_ABI = [
    'function balanceOf(address owner) view returns (uint256)',
    'function ownerOf(uint256 tokenId) view returns (address)',
    'function tokenURI(uint256 tokenId) view returns (string)',
    'function hasValidToken(address owner) view returns (bool)',
    'function getTokensByOwner(address owner) view returns (uint256[])',
    'function mint(address to, string memory uri) returns (uint256)',
    'function batchMint(address[] memory recipients, string[] memory uris)',
    'function revoke(uint256 tokenId)',
    'function hasRole(bytes32 role, address account) view returns (bool)',
    'function ADMIN_ROLE() view returns (bytes32)',
    'function MINTER_ROLE() view returns (bytes32)',
    'function DEFAULT_ADMIN_ROLE() view returns (bytes32)',
    'function nextTokenId() view returns (uint256)',
    'event TokenMinted(uint256 indexed tokenId, address indexed to, string tokenURI)',
    'event TokenRevoked(uint256 indexed tokenId, address indexed owner)',
    'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'
];
class SoulboundInvestigator {
    constructor() {
        const rpcUrls = [
            'https://ethereum-sepolia-rpc.publicnode.com',
            'https://sepolia.gateway.tenderly.co',
            'https://sepolia.infura.io/v3/ca485bd6567e4c5fb5693ee66a5885d8'
        ];
        this.provider = new ethers_1.ethers.JsonRpcProvider(rpcUrls[0]);
        this.contract = new ethers_1.ethers.Contract(SOULBOUND_NFT_CONTRACT, SOULBOUND_ABI, this.provider);
    }
    async initializeWithDeployer(deployerPrivateKey) {
        if (deployerPrivateKey) {
            this.deployerWallet = new ethers_1.ethers.Wallet(deployerPrivateKey, this.provider);
            logger_js_1.contractLogger.info('Deployer wallet initialized', {
                address: this.deployerWallet.address,
                expectedAddress: DEPLOYER_ADDRESS
            });
            if (this.deployerWallet.address.toLowerCase() !== DEPLOYER_ADDRESS.toLowerCase()) {
                throw new Error(`Deployer address mismatch! Expected: ${DEPLOYER_ADDRESS}, Got: ${this.deployerWallet.address}`);
            }
        }
    }
    async getContractInfo() {
        try {
            logger_js_1.contractLogger.info('Fetching contract information...');
            let totalSupply = 0;
            try {
                const nextId = await this.contract.nextTokenId();
                totalSupply = Math.max(0, Number(nextId) - 1);
            }
            catch (error) {
                logger_js_1.contractLogger.warn('nextTokenId not available, estimating from known tokens');
                for (let i = 1; i <= 20; i++) {
                    try {
                        await this.contract.ownerOf(i);
                        totalSupply = i;
                    }
                    catch {
                        break;
                    }
                }
            }
            const [adminRole, minterRole, defaultAdminRole] = await Promise.all([
                this.contract.ADMIN_ROLE(),
                this.contract.MINTER_ROLE(),
                this.contract.DEFAULT_ADMIN_ROLE()
            ]);
            const [deployerIsAdmin, deployerIsMinter, deployerIsDefaultAdmin] = await Promise.all([
                this.contract.hasRole(adminRole, DEPLOYER_ADDRESS),
                this.contract.hasRole(minterRole, DEPLOYER_ADDRESS),
                this.contract.hasRole(defaultAdminRole, DEPLOYER_ADDRESS)
            ]);
            const canMint = deployerIsMinter || deployerIsAdmin || deployerIsDefaultAdmin;
            logger_js_1.contractLogger.info('Contract information retrieved', {
                totalSupply,
                deployerIsAdmin,
                deployerIsMinter,
                deployerIsDefaultAdmin,
                canMint
            });
            return {
                totalSupply,
                deployerIsAdmin: deployerIsAdmin || deployerIsDefaultAdmin,
                deployerIsMinter,
                canMint
            };
        }
        catch (error) {
            logger_js_1.contractLogger.error('Failed to get contract info:', error);
            throw error;
        }
    }
    async investigateNodeNFTs() {
        const results = [];
        logger_js_1.contractLogger.info('Starting SoulBound NFT investigation for AI governance nodes...');
        for (let i = 0; i < NODE_ADDRESSES.length; i++) {
            const address = NODE_ADDRESSES[i];
            try {
                logger_js_1.contractLogger.info(`Investigating Node ${i + 1}: ${address}`);
                const [balance, hasValidToken] = await Promise.all([
                    this.contract.balanceOf(address),
                    this.contract.hasValidToken(address).catch(() => false)
                ]);
                const nftCount = Number(balance);
                let tokenIds = [];
                const tokenURIs = [];
                if (nftCount > 0) {
                    try {
                        const tokens = await this.contract.getTokensByOwner(address).catch(() => []);
                        tokenIds = tokens.map((id) => Number(id));
                        for (const tokenId of tokenIds) {
                            try {
                                const uri = await this.contract.tokenURI(tokenId);
                                tokenURIs.push(uri);
                            }
                            catch (error) {
                                logger_js_1.contractLogger.warn(`Failed to get URI for token ${tokenId}:`, error);
                                tokenURIs.push('');
                            }
                        }
                    }
                    catch (error) {
                        logger_js_1.contractLogger.warn(`Failed to get detailed token info for ${address}:`, error);
                    }
                }
                const result = {
                    address,
                    nodeIndex: i,
                    hasNFT: nftCount > 0,
                    nftCount,
                    tokenIds,
                    tokenURIs
                };
                results.push(result);
                logger_js_1.contractLogger.info(`Node ${i + 1} investigation complete`, {
                    address,
                    hasNFT: result.hasNFT,
                    nftCount: result.nftCount,
                    tokenIds: result.tokenIds
                });
            }
            catch (error) {
                logger_js_1.contractLogger.error(`Failed to investigate Node ${i + 1} (${address}):`, error);
                results.push({
                    address,
                    nodeIndex: i,
                    hasNFT: false,
                    nftCount: 0,
                    tokenIds: [],
                    tokenURIs: []
                });
            }
        }
        return results;
    }
    async getIdentityMetadata() {
        try {
            logger_js_1.contractLogger.info('Fetching identity metadata from d-loop.io...');
            const response = await axios_1.default.get('https://d-loop.io/identity/identity.json');
            return response.data;
        }
        catch (error) {
            logger_js_1.contractLogger.error('Failed to fetch identity metadata:', error);
            return null;
        }
    }
    async mintMissingNFTs(missingNodes, contractInfo) {
        if (!this.deployerWallet) {
            throw new Error('Deployer wallet not initialized. Cannot mint NFTs.');
        }
        if (!contractInfo.canMint) {
            throw new Error('Deployer does not have minting permissions.');
        }
        logger_js_1.contractLogger.info(`Minting SoulBound NFTs for ${missingNodes.length} nodes...`);
        const contractWithSigner = this.contract.connect(this.deployerWallet);
        const recipients = [];
        const uris = [];
        for (const node of missingNodes) {
            recipients.push(node.address);
            const uri = `https://d-loop.io/identity/ai-governance-node-${node.nodeIndex + 1}.json`;
            uris.push(uri);
        }
        try {
            const gasEstimate = await contractWithSigner.batchMint.estimateGas(recipients, uris);
            const gasLimit = (gasEstimate * 120n) / 100n;
            logger_js_1.contractLogger.info('Executing batch mint...', {
                recipients: recipients.length,
                gasEstimate: gasEstimate.toString(),
                gasLimit: gasLimit.toString()
            });
            const tx = await contractWithSigner.batchMint(recipients, uris, {
                gasLimit
            });
            logger_js_1.contractLogger.info('Batch mint transaction sent', {
                txHash: tx.hash,
                recipients: recipients.length
            });
            const receipt = await tx.wait();
            if (receipt?.status === 1) {
                logger_js_1.contractLogger.info('SoulBound NFTs minted successfully!', {
                    txHash: tx.hash,
                    blockNumber: receipt.blockNumber,
                    gasUsed: receipt.gasUsed.toString()
                });
            }
            else {
                throw new Error('Transaction failed');
            }
        }
        catch (error) {
            logger_js_1.contractLogger.error('Failed to mint SoulBound NFTs:', error);
            logger_js_1.contractLogger.info('Attempting individual mints as fallback...');
            for (let i = 0; i < recipients.length; i++) {
                try {
                    const tx = await contractWithSigner.mint(recipients[i], uris[i]);
                    await tx.wait();
                    logger_js_1.contractLogger.info(`Successfully minted NFT for ${recipients[i]}`);
                }
                catch (error) {
                    logger_js_1.contractLogger.error(`Failed to mint NFT for ${recipients[i]}:`, error);
                }
            }
        }
    }
    async verifyMinting(nodeAddresses) {
        logger_js_1.contractLogger.info('Verifying NFT assignments after minting...');
        for (const address of nodeAddresses) {
            try {
                const balance = await this.contract.balanceOf(address);
                const hasNFT = Number(balance) > 0;
                logger_js_1.contractLogger.info(`Verification for ${address}:`, {
                    hasNFT,
                    balance: balance.toString()
                });
            }
            catch (error) {
                logger_js_1.contractLogger.error(`Failed to verify ${address}:`, error);
            }
        }
    }
    async checkEtherscan() {
        try {
            logger_js_1.contractLogger.info('Checking Etherscan for additional contract information...');
            const abiUrl = `https://api-sepolia.etherscan.io/api?module=contract&action=getabi&address=${SOULBOUND_NFT_CONTRACT}&apikey=${ETHERSCAN_API_KEY}`;
            const codeUrl = `https://api-sepolia.etherscan.io/api?module=proxy&action=eth_getCode&address=${SOULBOUND_NFT_CONTRACT}&tag=latest&apikey=${ETHERSCAN_API_KEY}`;
            const [abiResponse, codeResponse] = await Promise.all([
                axios_1.default.get(abiUrl),
                axios_1.default.get(codeUrl)
            ]);
            const hasCode = codeResponse.data.result && codeResponse.data.result !== '0x';
            logger_js_1.contractLogger.info(`Contract exists on Sepolia: ${hasCode}`);
            if (abiResponse.data.status === '1') {
                logger_js_1.contractLogger.info('Contract verified on Etherscan');
                try {
                    const abi = JSON.parse(abiResponse.data.result);
                    logger_js_1.contractLogger.info(`Contract has ${abi.length} ABI functions/events`);
                    return abi;
                }
                catch (error) {
                    logger_js_1.contractLogger.warn('Failed to parse ABI from Etherscan');
                }
            }
            else {
                logger_js_1.contractLogger.warn('Contract not verified on Etherscan or API error:', abiResponse.data.result);
            }
            return null;
        }
        catch (error) {
            logger_js_1.contractLogger.warn('Failed to check Etherscan:', error);
            return null;
        }
    }
}
exports.SoulboundInvestigator = SoulboundInvestigator;
async function main() {
    const command = process.argv[2] || 'investigate';
    const deployerPrivateKey = process.argv[3];
    console.log('🔍 SoulBound NFT Investigation for AI Governance Nodes\n');
    try {
        const investigator = new SoulboundInvestigator();
        if (deployerPrivateKey) {
            await investigator.initializeWithDeployer(deployerPrivateKey);
        }
        switch (command) {
            case 'investigate':
                await runInvestigation(investigator);
                break;
            case 'mint':
                if (!deployerPrivateKey) {
                    throw new Error('Deployer private key required for minting. Usage: npm run soulbound:mint <deployer_private_key>');
                }
                await runMinting(investigator);
                break;
            case 'verify':
                await runVerification(investigator);
                break;
            default:
                console.log(`
SoulBound NFT Investigation Tool

Usage: npm run soulbound:<command> [deployer_private_key]

Commands:
  investigate  Check NFT assignments for all AI governance nodes (default)
  mint         Mint missing NFTs (requires deployer private key)
  verify       Verify current NFT assignments

Examples:
  npm run soulbound:investigate
  npm run soulbound:mint 0x...deployerPrivateKey
  npm run soulbound:verify
        `);
                break;
        }
    }
    catch (error) {
        logger_js_1.contractLogger.error('Investigation script failed:', error);
        console.error('❌ Investigation failed:', error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
}
async function runInvestigation(investigator) {
    const contractInfo = await investigator.getContractInfo();
    const identityData = await investigator.getIdentityMetadata();
    await investigator.checkEtherscan();
    const results = await investigator.investigateNodeNFTs();
    console.log('\n=== SOULBOUND NFT INVESTIGATION RESULTS ===\n');
    console.log('Contract Information:');
    console.log(`  📊 Total Supply: ${contractInfo.totalSupply} NFTs`);
    console.log(`  👑 Deployer is Admin: ${contractInfo.deployerIsAdmin ? 'YES' : 'NO'}`);
    console.log(`  🖨️  Deployer can Mint: ${contractInfo.canMint ? 'YES' : 'NO'}`);
    console.log(`  📄 Contract: ${SOULBOUND_NFT_CONTRACT}`);
    console.log(`  🚀 Deployer: ${DEPLOYER_ADDRESS}\n`);
    if (identityData) {
        console.log('Identity Metadata:');
        console.log(`  📋 Name: ${identityData.name || 'Unknown'}`);
        console.log(`  🌐 Network: ${identityData.network || 'Unknown'}`);
        console.log(`  📅 Last Updated: ${identityData.lastUpdated || 'Unknown'}\n`);
    }
    console.log('Node NFT Assignments:');
    const nodesWithNFTs = results.filter((r) => r.hasNFT);
    const nodesWithoutNFTs = results.filter((r) => !r.hasNFT);
    results.forEach((result, index) => {
        console.log(`  Node ${index + 1} (${result.address}):`);
        console.log(`    ✅ Has NFT: ${result.hasNFT ? 'YES' : 'NO'}`);
        console.log(`    📊 NFT Count: ${result.nftCount}`);
        if (result.tokenIds.length > 0) {
            console.log(`    🎫 Token IDs: ${result.tokenIds.join(', ')}`);
            result.tokenURIs.forEach((uri, i) => {
                if (uri)
                    console.log(`    🔗 Token ${result.tokenIds[i]} URI: ${uri}`);
            });
        }
        console.log('');
    });
    console.log(`📈 Summary: ${nodesWithNFTs.length}/${results.length} nodes have SoulBound NFTs assigned`);
    if (nodesWithoutNFTs.length > 0) {
        console.log(`\n⚠️  ${nodesWithoutNFTs.length} nodes need SoulBound NFTs:`);
        nodesWithoutNFTs.forEach((node) => {
            console.log(`  - Node ${node.nodeIndex + 1}: ${node.address}`);
        });
        console.log('\nTo mint missing NFTs, run:');
        console.log('npm run soulbound:mint <deployer_private_key>\n');
    }
    else {
        console.log('\n🎉 All AI governance nodes have SoulBound NFTs assigned!\n');
    }
}
async function runMinting(investigator) {
    console.log('🖨️  Minting SoulBound NFTs for AI Governance Nodes...\n');
    const contractInfo = await investigator.getContractInfo();
    const results = await investigator.investigateNodeNFTs();
    const missingNodes = results.filter((r) => !r.hasNFT);
    if (missingNodes.length === 0) {
        console.log('✅ All nodes already have SoulBound NFTs. No minting needed.\n');
        return;
    }
    console.log(`🎯 Found ${missingNodes.length} nodes without SoulBound NFTs. Proceeding with minting...\n`);
    await investigator.mintMissingNFTs(missingNodes, contractInfo);
    const missingAddresses = missingNodes.map((n) => n.address);
    await investigator.verifyMinting(missingAddresses);
    console.log('🎉 Minting process completed! Run investigation again to verify results.\n');
}
async function runVerification(investigator) {
    console.log('✅ Verifying SoulBound NFT assignments...\n');
    const results = await investigator.investigateNodeNFTs();
    console.log('Verification Results:');
    results.forEach((result, index) => {
        const status = result.hasNFT ? '✅ ASSIGNED' : '❌ MISSING';
        console.log(`  Node ${index + 1}: ${status} (${result.nftCount} NFTs)`);
    });
    const assignedCount = results.filter((r) => r.hasNFT).length;
    console.log(`\n📊 Overall Status: ${assignedCount}/${results.length} nodes have SoulBound NFTs\n`);
}
if (require.main === module) {
    main().catch((error) => {
        logger_js_1.contractLogger.error('Main execution failed:', error);
        console.error('❌ Execution failed:', error instanceof Error ? error.message : String(error));
        process.exit(1);
    });
}
//# sourceMappingURL=soulbound-investigation.js.map