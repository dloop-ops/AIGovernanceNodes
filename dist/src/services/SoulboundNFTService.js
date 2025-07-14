"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SoulboundNFTService = void 0;
const index_js_1 = require("../types/index.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
class SoulboundNFTService {
    constructor(walletService, contractService) {
        this.walletService = walletService;
        this.contractService = contractService;
    }
    async authenticateNode(nodeIndex) {
        try {
            const wallet = this.walletService.getWallet(nodeIndex);
            logger_js_1.default.info('Authenticating node with SoulBound NFT', {
                component: 'soulbound-nft',
                nodeIndex,
                nodeAddress: wallet.address
            });
            const hasValidNFT = await this.contractService.hasValidSoulboundNFT(nodeIndex);
            if (!hasValidNFT) {
                logger_js_1.default.warn('Node lacks valid SoulBound NFT for authentication', {
                    component: 'soulbound-nft',
                    nodeIndex,
                    nodeAddress: wallet.address
                });
                return false;
            }
            logger_js_1.default.info('Node authentication successful', {
                component: 'soulbound-nft',
                nodeIndex,
                nodeAddress: wallet.address
            });
            return true;
        }
        catch (error) {
            logger_js_1.default.error('Node authentication failed', {
                component: 'soulbound-nft',
                nodeIndex,
                error
            });
            return false;
        }
    }
    async getAuthenticationStatus() {
        const statuses = [];
        for (let i = 0; i < this.walletService.getWalletCount(); i++) {
            try {
                const wallet = this.walletService.getWallet(i);
                const isAuthenticated = await this.contractService.hasValidSoulboundNFT(i);
                const tokens = await this.contractService.getNodeSoulboundTokens(i);
                statuses.push({
                    nodeIndex: i,
                    address: wallet.address,
                    isAuthenticated,
                    tokenCount: tokens.length,
                    tokens
                });
            }
            catch (error) {
                logger_js_1.default.error(`Failed to get authentication status for node ${i}`, { error });
                statuses.push({
                    nodeIndex: i,
                    address: this.walletService.getWallet(i).address,
                    isAuthenticated: false,
                    tokenCount: 0,
                    tokens: []
                });
            }
        }
        return statuses;
    }
    async mintAuthenticationNFT(nodeIndex, nodeId, strategy) {
        try {
            const wallet = this.walletService.getWallet(nodeIndex);
            const metadata = JSON.stringify({
                nodeId,
                nodeType: 'governance',
                strategy,
                walletAddress: wallet.address,
                mintedAt: Date.now(),
                version: '1.0.0',
                description: `AI Governance Node ${nodeId} using ${strategy} strategy`,
                attributes: [
                    {
                        trait_type: 'Node Type',
                        value: 'AI Governance'
                    },
                    {
                        trait_type: 'Strategy',
                        value: strategy
                    },
                    {
                        trait_type: 'Network',
                        value: 'Sepolia'
                    }
                ]
            });
            logger_js_1.default.info('Attempting to mint SoulBound NFT for node authentication', {
                component: 'soulbound-nft',
                nodeIndex,
                nodeId,
                strategy,
                nodeAddress: wallet.address
            });
            const txHash = await this.contractService.mintSoulboundNFT(nodeIndex, metadata);
            logger_js_1.default.info('SoulBound NFT minted successfully for node', {
                component: 'soulbound-nft',
                nodeIndex,
                nodeId,
                txHash
            });
            return true;
        }
        catch (error) {
            logger_js_1.default.error('Failed to mint SoulBound NFT for node', {
                component: 'soulbound-nft',
                nodeIndex,
                nodeId,
                error
            });
            return false;
        }
    }
    async validateForGovernance(nodeIndex) {
        const isAuthenticated = await this.authenticateNode(nodeIndex);
        if (!isAuthenticated) {
            throw new index_js_1.GovernanceError(`Node ${nodeIndex} lacks valid SoulBound NFT authentication for governance participation`, 'AUTHENTICATION_REQUIRED');
        }
    }
    async identifyUnauthenticatedNodes() {
        const unauthenticatedNodes = [];
        for (let i = 0; i < this.walletService.getWalletCount(); i++) {
            const isAuthenticated = await this.authenticateNode(i);
            if (!isAuthenticated) {
                unauthenticatedNodes.push(i);
            }
        }
        return unauthenticatedNodes;
    }
    async authenticateAllNodes() {
        const totalNodes = this.walletService.getWalletCount();
        const unauthenticatedNodes = await this.identifyUnauthenticatedNodes();
        const authenticatedNodes = totalNodes - unauthenticatedNodes.length;
        logger_js_1.default.info('Node authentication summary', {
            component: 'soulbound-nft',
            totalNodes,
            authenticatedNodes,
            unauthenticatedCount: unauthenticatedNodes.length,
            unauthenticatedNodes
        });
        return {
            totalNodes,
            authenticatedNodes,
            unauthenticatedNodes
        };
    }
}
exports.SoulboundNFTService = SoulboundNFTService;
//# sourceMappingURL=SoulboundNFTService.js.map