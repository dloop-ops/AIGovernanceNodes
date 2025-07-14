"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EtherscanService = void 0;
const axios_1 = __importDefault(require("axios"));
const logger_js_1 = __importDefault(require("../utils/logger.js"));
class EtherscanService {
    constructor() {
        this.baseUrl = 'https://api-sepolia.etherscan.io/api';
        this.apiKey = process.env.ETHERSCAN_API_KEY || '';
        if (!this.apiKey) {
            throw new Error('ETHERSCAN_API_KEY is required');
        }
    }
    async getNFTTokens(address) {
        try {
            logger_js_1.default.info('Fetching NFT tokens for address', {
                component: 'etherscan',
                address
            });
            const response = await axios_1.default.get(this.baseUrl, {
                params: {
                    module: 'account',
                    action: 'tokennfttx',
                    address: address,
                    startblock: 0,
                    endblock: 'latest',
                    sort: 'desc',
                    apikey: this.apiKey
                }
            });
            if (response.data.status !== '1') {
                logger_js_1.default.warn('Etherscan API returned non-success status', {
                    component: 'etherscan',
                    status: response.data.status,
                    message: response.data.message
                });
                return [];
            }
            const transactions = response.data.result || [];
            const ownedTokens = [];
            const tokenMap = new Map();
            for (const tx of transactions) {
                const tokenKey = `${tx.contractAddress}-${tx.tokenID}`;
                if (tx.to.toLowerCase() === address.toLowerCase()) {
                    tokenMap.set(tokenKey, {
                        contractAddress: tx.contractAddress,
                        tokenID: tx.tokenID,
                        tokenName: tx.tokenName,
                        tokenSymbol: tx.tokenSymbol
                    });
                }
                else if (tx.from.toLowerCase() === address.toLowerCase()) {
                    tokenMap.delete(tokenKey);
                }
            }
            ownedTokens.push(...tokenMap.values());
            logger_js_1.default.info('NFT tokens retrieved', {
                component: 'etherscan',
                address,
                tokenCount: ownedTokens.length
            });
            return ownedTokens;
        }
        catch (error) {
            logger_js_1.default.error('Failed to fetch NFT tokens', {
                component: 'etherscan',
                address,
                error
            });
            return [];
        }
    }
    async getSoulboundNFTs(address, soulboundContractAddress) {
        try {
            const allNFTs = await this.getNFTTokens(address);
            const soulboundNFTs = allNFTs.filter((nft) => nft.contractAddress.toLowerCase() === soulboundContractAddress.toLowerCase());
            logger_js_1.default.info('SoulBound NFTs identified', {
                component: 'etherscan',
                address,
                soulboundContract: soulboundContractAddress,
                soulboundCount: soulboundNFTs.length,
                totalNFTs: allNFTs.length
            });
            return soulboundNFTs;
        }
        catch (error) {
            logger_js_1.default.error('Failed to get SoulBound NFTs', {
                component: 'etherscan',
                address,
                error
            });
            return [];
        }
    }
    async getTransactionDetails(txHash) {
        try {
            const response = await axios_1.default.get(this.baseUrl, {
                params: {
                    module: 'proxy',
                    action: 'eth_getTransactionByHash',
                    txhash: txHash,
                    apikey: this.apiKey
                }
            });
            if (response.data.result) {
                return response.data.result;
            }
            return null;
        }
        catch (error) {
            logger_js_1.default.error('Failed to get transaction details', {
                component: 'etherscan',
                txHash,
                error
            });
            return null;
        }
    }
    async verifyNFTOwnership(contractAddress, tokenId, ownerAddress) {
        try {
            const response = await axios_1.default.get(this.baseUrl, {
                params: {
                    module: 'proxy',
                    action: 'eth_call',
                    to: contractAddress,
                    data: `0x6352211e${tokenId.padStart(64, '0')}`,
                    tag: 'latest',
                    apikey: this.apiKey
                }
            });
            if (response.data.result) {
                const owner = '0x' + response.data.result.slice(-40);
                return owner.toLowerCase() === ownerAddress.toLowerCase();
            }
            return false;
        }
        catch (error) {
            logger_js_1.default.error('Failed to verify NFT ownership', {
                component: 'etherscan',
                contractAddress,
                tokenId,
                ownerAddress,
                error
            });
            return false;
        }
    }
}
exports.EtherscanService = EtherscanService;
//# sourceMappingURL=EtherscanService.js.map