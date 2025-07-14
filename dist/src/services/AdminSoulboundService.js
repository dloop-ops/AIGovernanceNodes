"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminSoulboundService = void 0;
const ethers_1 = require("ethers");
const networks_js_1 = require("../config/networks.js");
const contracts_js_1 = require("../config/contracts.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
class AdminSoulboundService {
    constructor() {
        const network = (0, networks_js_1.getCurrentNetwork)();
        this.provider = new ethers_1.ethers.JsonRpcProvider(network.rpcUrl);
        const adminPrivateKey = process.env.SOULBOUND_ADMIN_PRIVATE_KEY;
        if (!adminPrivateKey) {
            throw new Error('SOULBOUND_ADMIN_PRIVATE_KEY environment variable is required');
        }
        this.adminWallet = new ethers_1.ethers.Wallet(adminPrivateKey, this.provider);
        this.initializeContract();
        logger_js_1.default.info('Admin SoulBound service initialized', {
            component: 'admin-soulbound',
            adminAddress: this.adminWallet.address
        });
    }
    initializeContract() {
        const addresses = (0, contracts_js_1.getCurrentContractAddresses)();
        const soulboundAbi = [
            "function mint(address to, string memory tokenURI) external returns (uint256)",
            "function hasRole(bytes32 role, address account) external view returns (bool)",
            "function MINTER_ROLE() external view returns (bytes32)",
            "function balanceOf(address owner) external view returns (uint256)",
            "function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256)",
            "function ownerOf(uint256 tokenId) external view returns (address)",
            "function getTokensByOwner(address owner) external view returns (uint256[])",
            "function totalSupply() external view returns (uint256)",
            "event TokenMinted(uint256 indexed tokenId, address indexed to, string tokenURI)"
        ];
        this.soulboundContract = new ethers_1.ethers.Contract(addresses.soulboundNft, soulboundAbi, this.adminWallet);
    }
    async checkMinterRole() {
        try {
            const minterRole = await this.soulboundContract.MINTER_ROLE();
            const hasMinterRole = await this.soulboundContract.hasRole(minterRole, this.adminWallet.address);
            logger_js_1.default.info('Minter role check', {
                component: 'admin-soulbound',
                adminAddress: this.adminWallet.address,
                hasMinterRole
            });
            return hasMinterRole;
        }
        catch (error) {
            logger_js_1.default.error('Failed to check minter role', {
                component: 'admin-soulbound',
                error
            });
            return false;
        }
    }
    async mintForGovernanceNode(nodeAddress, nodeId) {
        try {
            logger_js_1.default.info('Minting SoulBound NFT for governance node', {
                component: 'admin-soulbound',
                nodeAddress,
                nodeId
            });
            const balance = await this.soulboundContract.balanceOf(nodeAddress);
            if (balance > 0) {
                logger_js_1.default.info('Node already has SoulBound NFT', {
                    component: 'admin-soulbound',
                    nodeAddress,
                    balance: balance.toString()
                });
                return {
                    success: true,
                    tokenId: 'existing'
                };
            }
            const metadata = {
                name: `AI Governance Node ${nodeId}`,
                description: `SoulBound NFT for DLoop AI Governance Node ${nodeId}`,
                image: `https://governance.dloop.io/nft/${nodeId}.png`,
                attributes: [
                    {
                        trait_type: 'Node Type',
                        value: 'AI Governance'
                    },
                    {
                        trait_type: 'Node ID',
                        value: nodeId
                    },
                    {
                        trait_type: 'Network',
                        value: 'Sepolia'
                    },
                    {
                        trait_type: 'Timestamp',
                        value: Date.now().toString()
                    }
                ]
            };
            const tokenURI = `data:application/json;base64,${Buffer.from(JSON.stringify(metadata)).toString('base64')}`;
            const tx = await this.soulboundContract.mint(nodeAddress, tokenURI);
            logger_js_1.default.info('SoulBound NFT mint transaction submitted', {
                component: 'admin-soulbound',
                nodeAddress,
                txHash: tx.hash
            });
            const receipt = await tx.wait();
            if (receipt.status === 1) {
                const mintEvent = receipt.logs.find((log) => log.topics[0] === ethers_1.ethers.id('Transfer(address,address,uint256)'));
                const tokenId = mintEvent ? ethers_1.ethers.toBigInt(mintEvent.topics[3]).toString() : 'unknown';
                logger_js_1.default.info('SoulBound NFT minted successfully', {
                    component: 'admin-soulbound',
                    nodeAddress,
                    txHash: tx.hash,
                    tokenId,
                    gasUsed: receipt.gasUsed.toString()
                });
                return {
                    success: true,
                    txHash: tx.hash,
                    tokenId
                };
            }
            else {
                throw new Error('Transaction failed');
            }
        }
        catch (error) {
            logger_js_1.default.error('Failed to mint SoulBound NFT', {
                component: 'admin-soulbound',
                nodeAddress,
                nodeId,
                error
            });
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
    async batchMintForGovernanceNodes(nodes) {
        const results = [];
        logger_js_1.default.info('Starting batch mint for governance nodes', {
            component: 'admin-soulbound',
            nodeCount: nodes.length
        });
        for (const node of nodes) {
            const result = await this.mintForGovernanceNode(node.address, node.nodeId);
            results.push({
                nodeId: node.nodeId,
                address: node.address,
                ...result
            });
            if (results.length < nodes.length) {
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        logger_js_1.default.info('Batch mint completed', {
            component: 'admin-soulbound',
            totalNodes: nodes.length,
            successful,
            failed
        });
        return results;
    }
    async verifyOwnership(nodeAddress) {
        try {
            logger_js_1.default.info('Verifying SoulBound NFT ownership', {
                component: 'admin-soulbound',
                nodeAddress
            });
            const balance = await this.soulboundContract.balanceOf(nodeAddress);
            const tokenCount = Number(balance);
            const tokenIds = [];
            logger_js_1.default.info('Balance check result', {
                component: 'admin-soulbound',
                nodeAddress,
                balance: balance.toString(),
                tokenCount
            });
            if (tokenCount > 0) {
                try {
                    const tokens = await this.soulboundContract.getTokensByOwner(nodeAddress);
                    for (const token of tokens) {
                        tokenIds.push(token.toString());
                    }
                }
                catch (error) {
                    logger_js_1.default.info('getTokensByOwner not available, trying tokenOfOwnerByIndex', {
                        component: 'admin-soulbound',
                        nodeAddress
                    });
                    for (let i = 0; i < tokenCount; i++) {
                        try {
                            const tokenId = await this.soulboundContract.tokenOfOwnerByIndex(nodeAddress, i);
                            tokenIds.push(tokenId.toString());
                        }
                        catch (indexError) {
                            logger_js_1.default.warn('Failed to get token by index', {
                                component: 'admin-soulbound',
                                nodeAddress,
                                index: i,
                                error: indexError
                            });
                        }
                    }
                }
            }
            const result = {
                hasNFT: tokenCount > 0,
                tokenCount,
                tokenIds
            };
            logger_js_1.default.info('Ownership verification complete', {
                component: 'admin-soulbound',
                nodeAddress,
                result
            });
            return result;
        }
        catch (error) {
            logger_js_1.default.error('Failed to verify ownership', {
                component: 'admin-soulbound',
                nodeAddress,
                error: error instanceof Error ? error.message : String(error)
            });
            return {
                hasNFT: false,
                tokenCount: 0,
                tokenIds: []
            };
        }
    }
    getAdminAddress() {
        return this.adminWallet.address;
    }
    async batchDistribute(nodes) {
        const results = [];
        logger_js_1.default.info(`Starting batch distribution for ${nodes.length} nodes...`);
        for (const node of nodes) {
            try {
                const result = await this.mintForGovernanceNode(node.address, node.nodeId);
                results.push({
                    nodeId: node.nodeId,
                    address: node.address,
                    ...result
                });
            }
            catch (error) {
                logger_js_1.default.error(`Failed to distribute to ${node.nodeId}:`, error);
                results.push({
                    nodeId: node.nodeId,
                    address: node.address,
                    success: false,
                    error: error.message
                });
            }
        }
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        return {
            distributed: successful,
            failed: failed,
            results: results
        };
    }
    async distributeAllSoulboundNFTs() {
        logger_js_1.default.info('🎯 Distributing SoulBound NFTs to all registered nodes...');
        const results = [];
        const nodes = await this.getRegisteredNodes();
        for (const node of nodes) {
            try {
                const result = await this.mintForGovernanceNode(node.address, node.nodeId);
                results.push({
                    nodeId: node.nodeId,
                    address: node.address,
                    ...result
                });
            }
            catch (error) {
                logger_js_1.default.error(`Failed to distribute SoulBound NFT to node ${node.nodeId}:`, error);
                results.push({
                    nodeId: node.nodeId,
                    address: node.address,
                    success: false,
                    error: error.message
                });
            }
        }
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        logger_js_1.default.info(`✅ SoulBound NFT distribution complete: ${successful} successful, ${failed} failed`);
        return {
            distributed: successful,
            failed: failed,
            results: results
        };
    }
    async getRegisteredNodes() {
        return [];
    }
}
exports.AdminSoulboundService = AdminSoulboundService;
//# sourceMappingURL=AdminSoulboundService.js.map