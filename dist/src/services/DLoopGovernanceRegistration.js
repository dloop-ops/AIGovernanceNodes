"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DLoopGovernanceRegistration = void 0;
const ethers_1 = require("ethers");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const logger_js_1 = require("../utils/logger.js");
const contracts_js_1 = require("../config/contracts.js");
class DLoopGovernanceRegistration {
    constructor(walletService) {
        this.walletService = walletService;
        this.provider = walletService.getProvider();
        const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY;
        if (!adminPrivateKey) {
            throw new Error('ADMIN_PRIVATE_KEY not configured');
        }
        this.adminWallet = new ethers_1.ethers.Wallet(adminPrivateKey, this.provider);
        this.initializeContracts();
    }
    initializeContracts() {
        try {
            const addresses = (0, contracts_js_1.getCurrentContractAddresses)();
            const abiDir = path_1.default.join(process.cwd(), 'abis');
            const aiNodeRegistryAbi = JSON.parse(fs_1.default.readFileSync(path_1.default.join(abiDir, 'ainoderegistry.abi.v1.json'), 'utf8')).abi;
            const dloopTokenAbi = JSON.parse(fs_1.default.readFileSync(path_1.default.join(abiDir, 'dlooptoken.abi.v1.json'), 'utf8')).abi;
            const soulboundNftAbi = JSON.parse(fs_1.default.readFileSync(path_1.default.join(abiDir, 'soulboundnft.abi.v1.json'), 'utf8')).abi;
            this.aiNodeRegistryContract = new ethers_1.ethers.Contract(addresses.aiNodeRegistry, aiNodeRegistryAbi, this.adminWallet);
            this.dloopTokenContract = new ethers_1.ethers.Contract(addresses.dloopToken, dloopTokenAbi, this.adminWallet);
            this.soulboundNftContract = new ethers_1.ethers.Contract(addresses.soulboundNft, soulboundNftAbi, this.adminWallet);
            logger_js_1.contractLogger.info('D-Loop governance contracts initialized', {
                component: 'dloop-governance',
                addresses: {
                    aiNodeRegistry: addresses.aiNodeRegistry,
                    dloopToken: addresses.dloopToken,
                    soulboundNft: addresses.soulboundNft,
                    adminAddress: this.adminWallet.address
                }
            });
        }
        catch (error) {
            throw new Error(`Failed to initialize D-Loop contracts: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async registerGovernanceNode(nodeIndex) {
        try {
            const nodeWallet = this.walletService.getWallet(nodeIndex);
            const nodeAddress = nodeWallet.address;
            const REGISTERED_ADDRESSES = [
                '0x0E354b735a6eee60726e6e3A431e3320Ba26ba45',
                '0xb1c25B40A79b7D046E539A9fbBB58789efFD0874',
                '0x65b1d03F5F2Ad4Ff036ea7AeEf5Ec07Db27a5C58',
                '0x766766f2815f835E4A0b1360833C7A15DDF2b72a',
                '0xA6fBf2dD68dB92dA309D6b82DAe2180d903a36FA'
            ];
            if (REGISTERED_ADDRESSES.includes(nodeAddress)) {
                logger_js_1.contractLogger.info(`🛑 REGISTRATION BLOCKED: Node ${nodeIndex + 1} (${nodeAddress}) already registered`, {
                    component: 'dloop-governance',
                    nodeIndex,
                    nodeAddress,
                    action: 'skip_registration_completely'
                });
                return {
                    success: true,
                    txHash: 'already_registered',
                    error: undefined
                };
            }
            logger_js_1.contractLogger.warn(`⚠️ UNEXPECTED: Attempting registration for unknown node ${nodeIndex}`, {
                component: 'dloop-governance',
                nodeIndex,
                nodeAddress
            });
            return {
                success: false,
                error: 'Registration blocked - only known registered nodes allowed'
            };
        }
        catch (error) {
            logger_js_1.contractLogger.error(`Registration error for node ${nodeIndex}`, {
                component: 'dloop-governance',
                nodeIndex,
                error: error instanceof Error ? error.message : String(error)
            });
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown registration error'
            };
        }
    }
    async verifyAdminPermissions() {
        try {
            const contractAdmin = await this.aiNodeRegistryContract.admin();
            if (contractAdmin.toLowerCase() !== this.adminWallet.address.toLowerCase()) {
                throw new Error(`Admin wallet ${this.adminWallet.address} is not the contract admin. Contract admin is: ${contractAdmin}`);
            }
            try {
                const minterRole = await this.soulboundNftContract.MINTER_ROLE();
                const hasMinterRole = await this.soulboundNftContract.hasRole(minterRole, this.adminWallet.address);
                if (!hasMinterRole) {
                    logger_js_1.contractLogger.warn('Admin wallet does not have MINTER_ROLE on SoulboundNFT, but proceeding with registration');
                }
            }
            catch (roleError) {
                logger_js_1.contractLogger.info('SoulboundNFT role check skipped (function may not exist)');
            }
            logger_js_1.contractLogger.info('Admin permissions verified', {
                component: 'dloop-governance',
                adminAddress: this.adminWallet.address,
                contractAdmin,
                isAdmin: true
            });
        }
        catch (error) {
            throw new Error(`Admin permission verification failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async ensureNodeSoulBoundNFT(nodeAddress) {
        try {
            const balance = await this.soulboundNftContract.balanceOf(nodeAddress);
            if (balance > 0) {
                logger_js_1.contractLogger.info('Node already has SoulBound NFT', {
                    component: 'dloop-governance',
                    nodeAddress,
                    nftBalance: balance.toString()
                });
                return;
            }
            logger_js_1.contractLogger.info('Minting SoulBound NFT for governance node', {
                component: 'dloop-governance',
                nodeAddress
            });
            const mintTx = await this.soulboundNftContract.safeMint(nodeAddress, `https://d-loop.io/identity/governance-node-${nodeAddress.toLowerCase()}.json`);
            const receipt = await mintTx.wait();
            logger_js_1.contractLogger.info('SoulBound NFT minted successfully', {
                component: 'dloop-governance',
                nodeAddress,
                txHash: receipt.transactionHash,
                gasUsed: receipt.gasUsed.toString()
            });
        }
        catch (error) {
            throw new Error(`SoulBound NFT setup failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async setupTokenStaking(nodeWallet) {
        try {
            const nodeAddress = nodeWallet.address;
            const stakeAmount = ethers_1.ethers.parseEther('1.0');
            const balance = await this.dloopTokenContract.balanceOf(nodeAddress);
            if (balance < stakeAmount) {
                throw new Error(`Insufficient DLOOP balance. Required: 1.0, Available: ${ethers_1.ethers.formatEther(balance)}`);
            }
            const addresses = (0, contracts_js_1.getCurrentContractAddresses)();
            const allowance = await this.dloopTokenContract.allowance(nodeAddress, addresses.aiNodeRegistry);
            if (allowance < stakeAmount) {
                logger_js_1.contractLogger.info('Approving DLOOP tokens for staking', {
                    component: 'dloop-governance',
                    nodeAddress,
                    amount: '1.0',
                    spender: addresses.aiNodeRegistry
                });
                const nodeTokenContract = this.dloopTokenContract.connect(nodeWallet);
                const approveTx = await nodeTokenContract.approve(addresses.aiNodeRegistry, stakeAmount);
                await approveTx.wait();
                logger_js_1.contractLogger.info('DLOOP tokens approved for staking', {
                    component: 'dloop-governance',
                    nodeAddress,
                    txHash: approveTx.hash
                });
            }
        }
        catch (error) {
            throw new Error(`Token staking setup failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async performAdminRegistration(nodeWallet) {
        try {
            const nodeAddress = nodeWallet.address;
            const nodeMetadata = {
                name: `D-Loop AI Governance Node ${nodeAddress.slice(0, 6)}`,
                description: 'Autonomous AI agent for D-Loop protocol governance and asset rebalancing decisions',
                endpoint: 'https://d-loop.io/identity/governance-node.json',
                nodeType: 'governance',
                version: '1.0.0',
                capabilities: ['proposal_creation', 'voting', 'asset_analysis'],
                registeredAt: Date.now()
            };
            const metadataJson = JSON.stringify(nodeMetadata);
            logger_js_1.contractLogger.info('Performing admin registration for governance node', {
                component: 'dloop-governance',
                nodeAddress,
                metadata: nodeMetadata
            });
            const registrationApproaches = ['registerAINode', 'registerNode', 'registerNodeWithStaking'];
            for (const approach of registrationApproaches) {
                try {
                    let tx;
                    switch (approach) {
                        case 'registerAINode':
                            tx = await this.aiNodeRegistryContract.registerAINode(nodeMetadata.endpoint, nodeMetadata.name, nodeMetadata.description, 1);
                            break;
                        case 'registerNode':
                            tx = await this.aiNodeRegistryContract.registerNode(nodeAddress, nodeAddress, metadataJson);
                            break;
                        case 'registerNodeWithStaking':
                            tx = await this.aiNodeRegistryContract.registerNodeWithStaking(nodeAddress, metadataJson, 0);
                            break;
                    }
                    const receipt = await tx.wait();
                    logger_js_1.contractLogger.info('Governance node registered successfully', {
                        component: 'dloop-governance',
                        nodeAddress,
                        approach,
                        txHash: receipt.transactionHash,
                        gasUsed: receipt.gasUsed.toString()
                    });
                    return { success: true, txHash: receipt.transactionHash };
                }
                catch (approachError) {
                    logger_js_1.contractLogger.warn(`Registration approach '${approach}' failed`, {
                        component: 'dloop-governance',
                        nodeAddress,
                        error: approachError instanceof Error ? approachError.message : String(approachError)
                    });
                    continue;
                }
            }
            throw new Error('All registration approaches failed');
        }
        catch (error) {
            logger_js_1.contractLogger.error('Admin registration failed', {
                component: 'dloop-governance',
                nodeAddress: nodeWallet.address,
                error: error instanceof Error ? error.message : String(error)
            });
            return { success: false, error: error instanceof Error ? error.message : String(error) };
        }
    }
    async verifyRegistrationStatus(nodeAddress) {
        try {
            const verificationMethods = ['isNodeRegistered', 'getNodeInfo', 'nodes'];
            for (const method of verificationMethods) {
                try {
                    let result;
                    switch (method) {
                        case 'isNodeRegistered':
                            result = await this.aiNodeRegistryContract.isNodeRegistered(nodeAddress);
                            if (result) {
                                logger_js_1.contractLogger.info('Node registration verified', {
                                    component: 'dloop-governance',
                                    nodeAddress,
                                    method: 'isNodeRegistered',
                                    registered: true
                                });
                                return;
                            }
                            break;
                        case 'getNodeInfo':
                            result = await this.aiNodeRegistryContract.getNodeInfo(nodeAddress);
                            if (result && result.isActive) {
                                logger_js_1.contractLogger.info('Node registration verified', {
                                    component: 'dloop-governance',
                                    nodeAddress,
                                    method: 'getNodeInfo',
                                    nodeInfo: result
                                });
                                return;
                            }
                            break;
                        case 'nodes':
                            result = await this.aiNodeRegistryContract.nodes(nodeAddress);
                            if (result && result.isActive) {
                                logger_js_1.contractLogger.info('Node registration verified', {
                                    component: 'dloop-governance',
                                    nodeAddress,
                                    method: 'nodes',
                                    nodeData: result
                                });
                                return;
                            }
                            break;
                    }
                }
                catch (methodError) {
                    continue;
                }
            }
            throw new Error('Node registration could not be verified');
        }
        catch (error) {
            logger_js_1.contractLogger.warn('Registration verification failed', {
                component: 'dloop-governance',
                nodeAddress,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
    async registerAllGovernanceNodes() {
        const results = [];
        const nodeCount = 5;
        const nodes = Array.from({ length: nodeCount }, (_, i) => this.walletService.getWallet(i));
        for (let i = 0; i < nodeCount; i++) {
            try {
                const result = await this.registerGovernanceNode(i);
                results.push({ nodeIndex: i, ...result });
            }
            catch (error) {
                logger_js_1.contractLogger.error(`Failed to register node ${i}:`, error);
                results.push({
                    nodeIndex: i,
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
        const registeredCount = results.filter((r) => r.success).length;
        const failedCount = results.filter((r) => !r.success).length;
        logger_js_1.contractLogger.info('🏁 D-Loop governance registration completed', {
            registered: registeredCount,
            failed: failedCount,
            totalAttempted: nodeCount,
            results: results.map((r) => ({ nodeId: r.nodeIndex, success: r.success, error: r.error }))
        });
        return { registered: registeredCount, failed: failedCount, results };
    }
}
exports.DLoopGovernanceRegistration = DLoopGovernanceRegistration;
//# sourceMappingURL=DLoopGovernanceRegistration.js.map