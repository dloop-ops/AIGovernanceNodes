"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnhancedContractService = void 0;
const ethers_1 = require("ethers");
const logger_js_1 = require("../utils/logger.js");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class EnhancedContractService {
    constructor(rpcManager, walletService) {
        this.contractABIs = new Map();
        this.rpcManager = rpcManager;
        this.walletService = walletService;
        this.contractAddresses = {
            aiNodeRegistry: '0x0045c7D99489f1d8A5900243956B0206344417DD',
            dloopToken: '0x05B366778566e93abfB8e4A9B794e4ad006446b4',
            soulboundNft: '0x6391C14631b2Be5374297fA3110687b80233104c'
        };
        this.loadEnhancedABIs();
    }
    loadEnhancedABIs() {
        try {
            const registryABIPath = path_1.default.join(process.cwd(), 'abis', 'ainoderegistry.abi.v2.json');
            if (fs_1.default.existsSync(registryABIPath)) {
                const registryData = JSON.parse(fs_1.default.readFileSync(registryABIPath, 'utf8'));
                this.contractABIs.set('aiNodeRegistry', registryData.abi);
                logger_js_1.contractLogger.info('Enhanced AI Node Registry ABI loaded');
            }
            else {
                this.contractABIs.set('aiNodeRegistry', [
                    'function registerNode(string metadata) external',
                    'function getNodeInfo(address) external view returns (tuple(address, string, bool, uint256, uint256, uint256))',
                    'function isNodeActive(address) external view returns (bool)',
                    'function nodeStakeAmount() external view returns (uint256)',
                    'error NodeNotRegistered()',
                    'error NodeAlreadyRegistered()'
                ]);
            }
            const nftABIPath = path_1.default.join(process.cwd(), 'abis', 'soulboundnft.abi.v2.json');
            if (fs_1.default.existsSync(nftABIPath)) {
                const nftData = JSON.parse(fs_1.default.readFileSync(nftABIPath, 'utf8'));
                this.contractABIs.set('soulboundNft', nftData.abi);
                logger_js_1.contractLogger.info('Enhanced SoulBound NFT ABI loaded');
            }
            else {
                this.contractABIs.set('soulboundNft', [
                    'function balanceOf(address) external view returns (uint256)',
                    'function mint(address, string) external returns (uint256)',
                    'function ownerOf(uint256) external view returns (address)'
                ]);
            }
            this.contractABIs.set('dloopToken', [
                'function balanceOf(address) external view returns (uint256)',
                'function approve(address, uint256) external returns (bool)',
                'function allowance(address, address) external view returns (uint256)',
                'function transfer(address, uint256) external returns (bool)'
            ]);
            logger_js_1.contractLogger.info('Enhanced contract ABIs loaded successfully');
        }
        catch (error) {
            logger_js_1.contractLogger.error('Failed to load enhanced ABIs', { error });
            throw error;
        }
    }
    async registerNode(nodeIndex, metadata) {
        try {
            const wallet = this.walletService.getWallet(nodeIndex);
            const registryABI = this.contractABIs.get('aiNodeRegistry');
            if (!registryABI) {
                throw new Error('AI Node Registry ABI not found');
            }
            logger_js_1.contractLogger.info('Attempting node registration with enhanced service', {
                nodeIndex,
                nodeAddress: wallet.address,
                metadataLength: metadata.length
            });
            const result = await this.rpcManager.executeWithRetry(async (provider) => {
                const contract = new ethers_1.ethers.Contract(this.contractAddresses.aiNodeRegistry, registryABI, wallet.connect(provider));
                try {
                    await contract.getNodeInfo(wallet.address);
                    logger_js_1.contractLogger.info('Node already registered', { nodeAddress: wallet.address });
                    return 'already_registered';
                }
                catch (error) {
                    if (!error.message.includes('NodeNotRegistered')) {
                        throw error;
                    }
                }
                const gasEstimate = await contract.registerNode.estimateGas(metadata);
                const gasLimit = (gasEstimate * 120n) / 100n;
                const tx = await contract.registerNode(metadata, {
                    gasLimit: gasLimit.toString(),
                    maxFeePerGas: ethers_1.ethers.parseUnits('15', 'gwei'),
                    maxPriorityFeePerGas: ethers_1.ethers.parseUnits('1.5', 'gwei')
                });
                logger_js_1.contractLogger.info('Registration transaction submitted', {
                    txHash: tx.hash,
                    gasLimit: gasLimit.toString()
                });
                const receipt = await tx.wait(1);
                if (receipt && receipt.status === 1) {
                    logger_js_1.contractLogger.info('Node registration successful', {
                        nodeAddress: wallet.address,
                        txHash: tx.hash,
                        gasUsed: receipt.gasUsed.toString()
                    });
                    return tx.hash;
                }
                else {
                    throw new Error('Transaction failed');
                }
            }, 3, 'Register Node');
            return result;
        }
        catch (error) {
            logger_js_1.contractLogger.error('Node registration failed', {
                nodeIndex,
                error: error.message
            });
            if (error.message.includes('NodeAlreadyRegistered')) {
                logger_js_1.contractLogger.info('Node was already registered', { nodeIndex });
                return 'already_registered';
            }
            throw error;
        }
    }
    async getNodeInfo(nodeAddress) {
        try {
            const registryABI = this.contractABIs.get('aiNodeRegistry');
            if (!registryABI) {
                throw new Error('AI Node Registry ABI not found');
            }
            const result = await this.rpcManager.executeWithRetry(async (provider) => {
                const contract = new ethers_1.ethers.Contract(this.contractAddresses.aiNodeRegistry, registryABI, provider);
                const nodeInfo = await contract.getNodeInfo(nodeAddress);
                return {
                    nodeAddress: nodeInfo[0],
                    metadata: nodeInfo[1],
                    isActive: nodeInfo[2],
                    stakedAmount: nodeInfo[3],
                    reputation: nodeInfo[4],
                    activeUntil: nodeInfo[5]
                };
            }, 3, 'Get Node Info');
            return result;
        }
        catch (error) {
            if (error.message.includes('NodeNotRegistered')) {
                return null;
            }
            throw error;
        }
    }
    async isNodeActive(nodeAddress) {
        try {
            const registryABI = this.contractABIs.get('aiNodeRegistry');
            if (!registryABI) {
                throw new Error('AI Node Registry ABI not found');
            }
            const result = await this.rpcManager.executeWithRetry(async (provider) => {
                const contract = new ethers_1.ethers.Contract(this.contractAddresses.aiNodeRegistry, registryABI, provider);
                return await contract.isNodeActive(nodeAddress);
            }, 3, 'Check Node Active Status');
            return result;
        }
        catch (error) {
            if (error.message.includes('NodeNotRegistered')) {
                return false;
            }
            throw error;
        }
    }
    async getSoulboundNFTBalance(nodeAddress) {
        try {
            const nftABI = this.contractABIs.get('soulboundNft');
            if (!nftABI) {
                throw new Error('SoulBound NFT ABI not found');
            }
            const result = await this.rpcManager.executeWithRetry(async (provider) => {
                const contract = new ethers_1.ethers.Contract(this.contractAddresses.soulboundNft, nftABI, provider);
                const balance = await contract.balanceOf(nodeAddress);
                return parseInt(balance.toString());
            }, 3, 'Get SoulBound NFT Balance');
            return result;
        }
        catch (error) {
            logger_js_1.contractLogger.error('Failed to get SoulBound NFT balance', { nodeAddress, error });
            return 0;
        }
    }
    async getDloopTokenBalance(nodeAddress) {
        try {
            const tokenABI = this.contractABIs.get('dloopToken');
            if (!tokenABI) {
                throw new Error('DLOOP Token ABI not found');
            }
            const result = await this.rpcManager.executeWithRetry(async (provider) => {
                const contract = new ethers_1.ethers.Contract(this.contractAddresses.dloopToken, tokenABI, provider);
                const balance = await contract.balanceOf(nodeAddress);
                return ethers_1.ethers.formatEther(balance);
            }, 3, 'Get DLOOP Token Balance');
            return result;
        }
        catch (error) {
            logger_js_1.contractLogger.error('Failed to get DLOOP token balance', { nodeAddress, error });
            return '0';
        }
    }
    async approveTokens(nodeIndex, spender, amount) {
        try {
            const wallet = this.walletService.getWallet(nodeIndex);
            const tokenABI = this.contractABIs.get('dloopToken');
            if (!tokenABI) {
                throw new Error('DLOOP Token ABI not found');
            }
            const result = await this.rpcManager.executeWithRetry(async (provider) => {
                const contract = new ethers_1.ethers.Contract(this.contractAddresses.dloopToken, tokenABI, wallet.connect(provider));
                const amountWei = ethers_1.ethers.parseEther(amount);
                const tx = await contract.approve(spender, amountWei, {
                    gasLimit: '100000',
                    maxFeePerGas: ethers_1.ethers.parseUnits('15', 'gwei'),
                    maxPriorityFeePerGas: ethers_1.ethers.parseUnits('1.5', 'gwei')
                });
                const receipt = await tx.wait(1);
                if (receipt && receipt.status === 1) {
                    logger_js_1.contractLogger.info('Token approval successful', {
                        nodeIndex,
                        spender,
                        amount,
                        txHash: tx.hash
                    });
                    return tx.hash;
                }
                else {
                    throw new Error('Approval transaction failed');
                }
            }, 3, 'Approve Tokens');
            return result;
        }
        catch (error) {
            logger_js_1.contractLogger.error('Token approval failed', { nodeIndex, spender, amount, error });
            throw error;
        }
    }
    getContractAddresses() {
        return this.contractAddresses;
    }
}
exports.EnhancedContractService = EnhancedContractService;
//# sourceMappingURL=EnhancedContractService.js.map