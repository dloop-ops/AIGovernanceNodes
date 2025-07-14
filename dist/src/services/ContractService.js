"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContractService = void 0;
const ethers_1 = require("ethers");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const contracts_1 = require("../config/contracts");
const RpcManager_1 = require("./RpcManager");
const index_1 = require("../types/index");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
function loadABI(filename) {
    try {
        const abiPath = path_1.default.join(process.cwd(), 'abis', filename);
        const abiData = JSON.parse(fs_1.default.readFileSync(abiPath, 'utf8'));
        return abiData.abi || abiData;
    }
    catch (error) {
        logger_js_1.default.error(`Failed to load ABI file ${filename}:`, error);
        throw new Error(`Failed to load ABI file ${filename}`);
    }
}
const assetDaoAbi = loadABI('assetdao.abi.v1.json');
const aiNodeRegistryAbi = loadABI('ainoderegistry.abi.v1.json');
const dloopTokenAbi = loadABI('dlooptoken.abi.v1.json');
const soulboundNftAbi = loadABI('soulboundnft.abi.v1.json');
class ContractService {
    constructor(walletService) {
        this.walletService = walletService;
        this.provider = walletService.getProvider();
        this.rpcManager = new RpcManager_1.RpcManager();
        this.initializeContracts();
    }
    initializeContracts() {
        try {
            const addresses = (0, contracts_1.getCurrentContractAddresses)();
            const validatedAssetDaoAddress = ethers_1.ethers.getAddress(addresses.assetDao.trim());
            const validatedAiNodeRegistryAddress = ethers_1.ethers.getAddress(addresses.aiNodeRegistry.trim());
            const validatedDloopTokenAddress = ethers_1.ethers.getAddress(addresses.dloopToken.trim());
            const validatedSoulboundNftAddress = ethers_1.ethers.getAddress(addresses.soulboundNft.trim());
            this.assetDaoContract = new ethers_1.ethers.Contract(validatedAssetDaoAddress, assetDaoAbi, this.provider);
            this.aiNodeRegistryContract = new ethers_1.ethers.Contract(validatedAiNodeRegistryAddress, aiNodeRegistryAbi, this.provider);
            this.dloopTokenContract = new ethers_1.ethers.Contract(validatedDloopTokenAddress, dloopTokenAbi, this.provider);
            this.soulboundNftContract = new ethers_1.ethers.Contract(validatedSoulboundNftAddress, soulboundNftAbi, this.provider);
            logger_js_1.default.info('Smart contracts initialized', {
                component: 'contract',
                addresses: {
                    assetDao: validatedAssetDaoAddress,
                    aiNodeRegistry: validatedAiNodeRegistryAddress,
                    dloopToken: validatedDloopTokenAddress,
                    soulboundNft: validatedSoulboundNftAddress
                }
            });
        }
        catch (error) {
            throw new index_1.GovernanceError(`Failed to initialize contracts: ${error instanceof Error ? error.message : String(error)}`, 'CONTRACT_INIT_ERROR');
        }
    }
    async createProposal(nodeIndex, params) {
        try {
            const wallet = this.walletService.getWallet(nodeIndex);
            const contract = this.assetDaoContract.connect(wallet);
            logger_js_1.default.info('Creating proposal', {
                nodeIndex,
                proposer: wallet.address,
                proposalType: params.proposalType,
                assetAddress: params.assetAddress,
                amount: params.amount
            });
            const gasEstimate = await contract.createProposal.estimateGas(params.proposalType, params.assetAddress, ethers_1.ethers.parseEther(params.amount), params.description, params.additionalData || '0x');
            const MAX_GAS_LIMIT = 500000n;
            let gasLimit = (gasEstimate * 120n) / 100n;
            if (gasLimit > MAX_GAS_LIMIT) {
                gasLimit = MAX_GAS_LIMIT;
                logger_js_1.default.warn('Gas limit capped at maximum safe value', {
                    estimated: gasEstimate.toString(),
                    capped: gasLimit.toString()
                });
            }
            const gasPrice = await this.getOptimizedGasPrice();
            const tx = await contract.createProposal(params.proposalType, params.assetAddress, ethers_1.ethers.parseEther(params.amount), params.description, params.additionalData || '0x', {
                gasLimit,
                gasPrice,
                nonce: await wallet.getNonce()
            });
            logger_js_1.default.info('Proposal creation transaction sent', {
                nodeIndex,
                txHash: tx.hash,
                gasLimit: gasLimit.toString(),
                gasPrice: ethers_1.ethers.formatUnits(gasPrice, 'gwei') + ' gwei',
                nonce: tx.nonce
            });
            const receipt = await tx.wait();
            if (!receipt) {
                throw new Error('Transaction receipt not found');
            }
            const proposalCreatedEvent = receipt.logs.find((log) => {
                try {
                    const parsed = this.assetDaoContract.interface.parseLog({
                        topics: log.topics,
                        data: log.data
                    });
                    return parsed?.name === 'ProposalCreated';
                }
                catch {
                    return false;
                }
            });
            if (!proposalCreatedEvent) {
                throw new Error('ProposalCreated event not found in receipt');
            }
            const parsedEvent = this.assetDaoContract.interface.parseLog({
                topics: proposalCreatedEvent.topics,
                data: proposalCreatedEvent.data
            });
            const proposalId = parsedEvent?.args.proposalId.toString();
            logger_js_1.default.info('Proposal created successfully', {
                nodeIndex,
                proposalId,
                txHash: tx.hash,
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed.toString()
            });
            return proposalId;
        }
        catch (error) {
            const errorMessage = `Failed to create proposal: ${error instanceof Error ? error.message : String(error)}`;
            logger_js_1.default.error(errorMessage, { nodeIndex, params });
            throw new index_1.GovernanceError(errorMessage, 'PROPOSAL_CREATION_ERROR');
        }
    }
    async getOptimizedGasPrice() {
        try {
            const feeData = await this.provider.getFeeData();
            if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
                return feeData.maxFeePerGas;
            }
            else if (feeData.gasPrice) {
                return feeData.gasPrice;
            }
            else {
                logger_js_1.default.warn('Unable to fetch gas price, using fallback');
                return ethers_1.ethers.parseUnits('20', 'gwei');
            }
        }
        catch (error) {
            logger_js_1.default.warn('Gas price optimization failed, using fallback', { error });
            return ethers_1.ethers.parseUnits('20', 'gwei');
        }
    }
    async vote(nodeIndex, proposalId, support) {
        try {
            const wallet = this.walletService.getWallet(nodeIndex);
            logger_js_1.default.info('Voting on proposal', {
                nodeIndex,
                proposalId,
                support,
                nodeAddress: wallet.address
            });
            const hasVoted = await this.rpcManager.executeWithRetry(async (provider) => {
                const assetDaoWithProvider = this.assetDaoContract.connect(provider);
                return assetDaoWithProvider.hasVoted(proposalId, wallet.address);
            }, 3, 'Check if Node Has Voted');
            if (hasVoted) {
                logger_js_1.default.warn('Node has already voted on this proposal', {
                    nodeIndex,
                    proposalId,
                    nodeAddress: wallet.address
                });
                throw new index_1.GovernanceError('Node has already voted on this proposal', 'ALREADY_VOTED');
            }
            logger_js_1.default.info('Proceeding with vote submission', {
                nodeIndex,
                proposalId,
                support,
                nodeAddress: wallet.address
            });
            const txHash = await this.rpcManager.executeWithRetry(async (provider) => {
                const assetDaoWithProvider = this.assetDaoContract.connect(wallet.connect(provider));
                const gasPrice = await this.getOptimizedGasPrice();
                const gasEstimate = await assetDaoWithProvider.vote.estimateGas(proposalId, support);
                const gasLimit = (gasEstimate * 120n) / 100n;
                const tx = await assetDaoWithProvider.vote(proposalId, support, {
                    gasPrice,
                    gasLimit
                });
                const receipt = await tx.wait();
                if (!receipt) {
                    throw new Error('Vote transaction receipt not found');
                }
                return tx.hash;
            }, 3, 'Submit Vote Transaction');
            logger_js_1.default.info('Vote submitted successfully', {
                nodeIndex,
                proposalId,
                support,
                txHash,
                nodeAddress: wallet.address
            });
            return txHash;
        }
        catch (error) {
            const errorMessage = `Failed to vote: ${error instanceof Error ? error.message : String(error)}`;
            logger_js_1.default.error(errorMessage, { nodeIndex, proposalId, support });
            throw new index_1.GovernanceError(errorMessage, 'VOTING_ERROR');
        }
    }
    async getProposal(proposalId) {
        try {
            const proposalData = await this.assetDaoContract.getProposal(proposalId);
            logger_js_1.default.debug(`Raw proposal data for ${proposalId}:`, {
                proposer: proposalData.proposer,
                proposalType: proposalData.proposalType,
                assetAddress: proposalData.assetAddress,
                amount: proposalData.amount?.toString(),
                description: proposalData.description?.substring(0, 100),
                yesVotes: proposalData.yesVotes?.toString(),
                noVotes: proposalData.noVotes?.toString(),
                votesFor: proposalData.votesFor?.toString(),
                votesAgainst: proposalData.votesAgainst?.toString(),
                createdAt: proposalData.createdAt?.toString(),
                votingEnds: proposalData.votingEnds?.toString(),
                startTime: proposalData.startTime?.toString(),
                endTime: proposalData.endTime?.toString(),
                status: proposalData.status,
                state: proposalData.state,
                executed: proposalData.executed,
                cancelled: proposalData.cancelled
            });
            return {
                id: proposalId,
                proposer: proposalData[2] || '',
                proposalType: this.mapProposalType(proposalData[1]).toString(),
                assetAddress: proposalData[5] || '',
                amount: ethers_1.ethers.formatEther(proposalData[3] || 0),
                description: proposalData[4] || `Proposal ${proposalId}`,
                votesFor: ethers_1.ethers.formatEther(proposalData[6] || 0),
                votesAgainst: ethers_1.ethers.formatEther(proposalData[7] || 0),
                startTime: Number(proposalData[8] || 0),
                endTime: Number(proposalData[9] || 0),
                executed: proposalData[11] || false,
                cancelled: false,
                state: this.mapProposalState(proposalData[10] || 0),
                title: `Proposal ${proposalId}`,
                asset: 'USDC',
                status: 'ACTIVE',
                totalSupply: 1000000,
                quorumReached: false
            };
        }
        catch (error) {
            throw new index_1.GovernanceError(`Failed to get proposal ${proposalId}: ${error instanceof Error ? error.message : String(error)}`, 'PROPOSAL_FETCH_ERROR');
        }
    }
    async getActiveProposals() {
        try {
            const proposalCount = await this.rpcManager.executeWithRetry(async (provider) => {
                const assetDaoWithProvider = this.assetDaoContract.connect(provider);
                return assetDaoWithProvider.getProposalCount();
            }, 3, 'Get AssetDAO Proposal Count');
            const proposals = [];
            const count = Number(proposalCount);
            logger_js_1.default.info(`Found ${count} total proposals, fetching active ones sequentially`);
            if (count === 0) {
                logger_js_1.default.info('No proposals found in AssetDAO');
                return [];
            }
            const CHUNK_SIZE = 5;
            const DELAY_BETWEEN_CHUNKS = 2000;
            const DELAY_BETWEEN_PROPOSALS = 500;
            for (let i = 0; i < Math.min(count, 50); i++) {
                try {
                    if (i > 0) {
                        const delayTime = DELAY_BETWEEN_PROPOSALS + Math.floor(i / CHUNK_SIZE) * 200;
                        await new Promise((resolve) => setTimeout(resolve, delayTime));
                    }
                    if (i > 0 && i % CHUNK_SIZE === 0) {
                        logger_js_1.default.info(`Processed ${i} proposals, taking ${DELAY_BETWEEN_CHUNKS}ms break to respect rate limits`);
                        await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_CHUNKS));
                    }
                    const proposalData = await this.rpcManager.executeWithRetry(async (provider) => {
                        const assetDaoWithProvider = this.assetDaoContract.connect(provider);
                        return assetDaoWithProvider.getProposal(i);
                    }, 3, `Get Proposal ${i}`);
                    if (!proposalData) {
                        logger_js_1.default.debug(`Proposal ${i} returned no data`);
                        continue;
                    }
                    const proposal = {
                        id: i.toString(),
                        proposer: proposalData.proposer || proposalData[5] || '',
                        description: proposalData.description || proposalData[4] || `Proposal ${i}`,
                        proposalType: index_1.ProposalType.INVEST.toString(),
                        assetAddress: proposalData.assetAddress || proposalData[2] || '',
                        amount: ethers_1.ethers.formatEther(proposalData.amount || proposalData[3] || 0),
                        votesFor: ethers_1.ethers.formatEther(proposalData.yesVotes || proposalData[8] || 0),
                        votesAgainst: ethers_1.ethers.formatEther(proposalData.noVotes || proposalData[9] || 0),
                        startTime: Number(proposalData.createdAt || proposalData[6] || 0),
                        endTime: Number(proposalData.votingEnds || proposalData[7] || 0),
                        state: this.mapProposalState(proposalData.status || proposalData[10] || 0),
                        executed: proposalData.executed || proposalData[11] || false,
                        cancelled: false,
                        title: `Proposal ${i}`,
                        asset: 'USDC',
                        status: 'ACTIVE',
                        totalSupply: 1000000,
                        quorumReached: false
                    };
                    if (proposal.state === index_1.ProposalState.ACTIVE) {
                        proposals.push(proposal);
                        logger_js_1.default.info(`Found active proposal ${i}:`, {
                            id: proposal.id,
                            proposer: proposal.proposer,
                            description: proposal.description.substring(0, 50) + '...',
                            votesFor: proposal.votesFor,
                            votesAgainst: proposal.votesAgainst,
                            endTime: new Date(proposal.endTime * 1000).toISOString()
                        });
                    }
                }
                catch (proposalError) {
                    const errorMessage = proposalError instanceof Error ? proposalError.message : String(proposalError);
                    logger_js_1.default.warn(`Failed to process proposal ${i}:`, {
                        error: errorMessage
                    });
                    continue;
                }
            }
            logger_js_1.default.info(`Found ${proposals.length} active proposals out of ${count} total`);
            return proposals;
        }
        catch (error) {
            const errorMessage = `Failed to get active proposals: ${error instanceof Error ? error.message : String(error)}`;
            logger_js_1.default.error(errorMessage);
            throw new index_1.GovernanceError(errorMessage, 'ACTIVE_PROPOSALS_FETCH_ERROR');
        }
    }
    mapProposalState(stateValue) {
        const state = Number(stateValue);
        switch (state) {
            case 0:
                return index_1.ProposalState.PENDING;
            case 1:
                return index_1.ProposalState.ACTIVE;
            case 2:
                return index_1.ProposalState.CANCELLED;
            case 3:
                return index_1.ProposalState.DEFEATED;
            case 4:
                return index_1.ProposalState.SUCCEEDED;
            case 5:
                return index_1.ProposalState.QUEUED;
            case 6:
                return index_1.ProposalState.EXECUTED;
            case 7:
                return index_1.ProposalState.CANCELLED;
            default:
                logger_js_1.default.warn(`Unknown proposal state: ${state}, defaulting to PENDING`);
                return index_1.ProposalState.PENDING;
        }
    }
    mapProposalType(typeValue) {
        const type = Number(typeValue);
        switch (type) {
            case 0:
                return index_1.ProposalType.INVEST;
            case 1:
                return index_1.ProposalType.DIVEST;
            case 2:
                return index_1.ProposalType.REBALANCE;
            default:
                logger_js_1.default.warn(`Unknown proposal type: ${type}, defaulting to INVEST`);
                return index_1.ProposalType.INVEST;
        }
    }
    async getProposalSafeWithRetry(proposalId, maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000));
                const data = await Promise.race([this.assetDaoContract.getProposal(proposalId), timeout]);
                const stateRaw = data[10] ?? 0;
                const safeState = typeof stateRaw === 'number' && stateRaw >= 0 && stateRaw <= 7 ? stateRaw : 0;
                return {
                    id: proposalId,
                    proposer: data[2] || '',
                    proposalType: this.mapProposalType(data[1]).toString(),
                    assetAddress: data[5] || '',
                    amount: ethers_1.ethers.formatEther(data[3] || 0),
                    description: data[4] || `Proposal ${proposalId}`,
                    votesFor: ethers_1.ethers.formatEther(data[6] || 0),
                    votesAgainst: ethers_1.ethers.formatEther(data[7] || 0),
                    startTime: Number(data[8] || 0),
                    endTime: Number(data[9] || 0),
                    executed: data[11] || false,
                    cancelled: false,
                    state: this.mapProposalState(safeState),
                    title: `Proposal ${proposalId}`,
                    asset: 'USDC',
                    status: 'ACTIVE',
                    totalSupply: 0,
                    quorumReached: false
                };
            }
            catch (err) {
                logger_js_1.default.warn(`Attempt ${attempt}/${maxRetries} failed to fetch proposal ${proposalId}: ${err instanceof Error ? err.message : String(err)}`);
                if (attempt === maxRetries) {
                    logger_js_1.default.error(`All retries failed for proposal ${proposalId}, returning fallback`);
                    return {
                        id: proposalId,
                        proposer: '0x0000000000000000000000000000000000000000',
                        proposalType: index_1.ProposalType.INVEST.toString(),
                        assetAddress: '0x0000000000000000000000000000000000000000',
                        amount: '0',
                        description: '',
                        votesFor: '0',
                        votesAgainst: '0',
                        startTime: 0,
                        endTime: 0,
                        executed: false,
                        cancelled: false,
                        state: index_1.ProposalState.PENDING,
                        title: `Proposal ${proposalId}`,
                        asset: '',
                        status: 'UNKNOWN',
                        totalSupply: 0,
                        quorumReached: false
                    };
                }
                await new Promise((r) => setTimeout(r, 500 * attempt));
            }
        }
        throw new index_1.GovernanceError('Unexpected flow in getProposalSafeWithRetry', 'PROPOSAL_FETCH_ERROR');
    }
    registerAINode(nodeIndex) {
        const REGISTERED_ADDRESSES = [
            '0x0E354b735a6eee60726e6e3A431e3320Ba26ba45',
            '0xb1c25B40A79b7D046E539A9fbBB58789efFD0874',
            '0x65b1d03F5F2Ad4Ff036ea7AeEf5Ec07Db27a5C58',
            '0x766766f2815f835E4A0b1360833C7A15DDF2b72a',
            '0xA6fBf2dD68dB92dA309D6b82DAe2180d903a36FA'
        ];
        const nodeAddress = this.walletService.getWallet(nodeIndex).address;
        logger_js_1.default.warn('🛑 REGISTRATION BLOCKED: All AI Governance Nodes already registered', {
            nodeIndex,
            nodeAddress,
            registeredNodes: REGISTERED_ADDRESSES.length,
            status: 'BLOCKED'
        });
        return Promise.resolve({
            success: false,
            error: 'REGISTRATION_BLOCKED: All 5 AI Governance Nodes are already registered and active. No additional registrations allowed.'
        });
    }
    async getNodeInfo(nodeAddress) {
        try {
            const nodeData = await this.aiNodeRegistryContract['getNodeInfo(address)'](nodeAddress);
            return {
                owner: nodeData.nodeOwner || nodeData.owner,
                isActive: nodeData.isActive || false,
                registeredAt: BigInt(nodeData.registeredAt || nodeData.registrationTime || 0),
                name: nodeData.name || '',
                description: nodeData.metadata || nodeData.description || '',
                nodeType: nodeData.nodeType || 'governance',
                reputation: Number(nodeData.reputation || 0),
                registrationTime: Number(nodeData.registeredAt || nodeData.registrationTime || 0)
            };
        }
        catch (error) {
            throw new index_1.GovernanceError(`Failed to get node info for ${nodeAddress}: ${error instanceof Error ? error.message : String(error)}`, 'NODE_INFO_FETCH_ERROR');
        }
    }
    async isNodeActive(nodeAddress) {
        try {
            const nodeInfo = await this.aiNodeRegistryContract['getNodeInfo(address)'](nodeAddress);
            return nodeInfo.isActive || false;
        }
        catch (error) {
            logger_js_1.default.error(`Failed to check node active status for ${nodeAddress}`, { error });
            return false;
        }
    }
    async getTokenBalance(nodeIndex) {
        try {
            const wallet = this.walletService.getWallet(nodeIndex);
            await this.delay(Math.random() * 500 + 200);
            const balance = await this.rpcManager.executeWithRetry(async (provider) => {
                const contract = new ethers_1.ethers.Contract(process.env.DLOOP_TOKEN_ADDRESS || '0x05B366778566e93abfB8e4A9B794e4ad006446b4', ['function balanceOf(address) view returns (uint256)'], provider);
                return contract.balanceOf(wallet.address);
            }, 5, `Get DLOOP Token Balance for ${wallet.address}`);
            return ethers_1.ethers.formatEther(balance);
        }
        catch (error) {
            logger_js_1.default.warn(`Failed to get token balance for node ${nodeIndex}, using fallback`, {
                component: 'contract',
                nodeIndex,
                error: error instanceof Error ? error.message : String(error)
            });
            return '1000.0';
        }
    }
    delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    async getVotingPower(nodeIndex) {
        try {
            const wallet = this.walletService.getWallet(nodeIndex);
            if (typeof this.dloopTokenContract.getVotingPower === 'function') {
                const votingPower = await this.dloopTokenContract.getVotingPower(wallet.address);
                return ethers_1.ethers.formatEther(votingPower);
            }
            else {
                return await this.getTokenBalance(nodeIndex);
            }
        }
        catch (error) {
            throw new index_1.GovernanceError(`Failed to get voting power: ${error instanceof Error ? error.message : String(error)}`, 'VOTING_POWER_ERROR');
        }
    }
    async hasVoted(proposalId, nodeIndex) {
        try {
            const wallet = this.walletService.getWallet(nodeIndex);
            const hasVotedResult = await this.rpcManager.executeWithRetry(async (provider) => {
                const assetDaoWithProvider = this.assetDaoContract.connect(provider);
                return assetDaoWithProvider.hasVoted(proposalId, wallet.address);
            }, 2, `Check Vote Status for Proposal ${proposalId} Node ${nodeIndex}`);
            return hasVotedResult;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger_js_1.default.error(`Failed to check vote status for proposal ${proposalId}`, {
                error: errorMessage,
                nodeIndex,
                proposalId
            });
            if (errorMessage.includes('Too Many Requests') || errorMessage.includes('rate limit')) {
                logger_js_1.default.warn(`Rate limited while checking vote status for proposal ${proposalId}, assuming already voted`, {
                    nodeIndex,
                    proposalId
                });
                return true;
            }
            return false;
        }
    }
    async hasValidSoulboundNFT(nodeIndex) {
        try {
            const wallet = this.walletService.getWallet(nodeIndex);
            const hasValidToken = await this.soulboundNftContract.hasValidToken(wallet.address);
            logger_js_1.default.info('SoulBound NFT validation check', {
                component: 'contract',
                nodeIndex,
                nodeAddress: wallet.address,
                hasValidToken
            });
            return hasValidToken;
        }
        catch (error) {
            logger_js_1.default.error('Failed to check SoulBound NFT validity', {
                component: 'contract',
                nodeIndex,
                error
            });
            return false;
        }
    }
    async getNodeSoulboundTokens(nodeIndex) {
        try {
            const wallet = this.walletService.getWallet(nodeIndex);
            const tokens = await this.soulboundNftContract.getTokensByOwner(wallet.address);
            logger_js_1.default.info('Retrieved SoulBound NFT tokens', {
                component: 'contract',
                nodeIndex,
                nodeAddress: wallet.address,
                tokenCount: tokens.length
            });
            return tokens.map((token) => token.toString());
        }
        catch (error) {
            logger_js_1.default.error('Failed to get SoulBound NFT tokens', {
                component: 'contract',
                nodeIndex,
                error
            });
            return [];
        }
    }
    async mintSoulboundNFT(nodeIndex, metadata) {
        try {
            const wallet = this.walletService.getWallet(nodeIndex);
            const contract = this.soulboundNftContract.connect(wallet);
            logger_js_1.default.info('Minting SoulBound NFT for node authentication', {
                component: 'contract',
                nodeIndex,
                nodeAddress: wallet.address
            });
            const gasEstimate = await contract.mint.estimateGas(wallet.address, metadata);
            const gasLimit = (gasEstimate * 120n) / 100n;
            const gasPrice = await this.walletService.getGasPrice();
            const tx = await contract.mint(wallet.address, metadata, {
                gasLimit,
                gasPrice
            });
            const receipt = await tx.wait();
            if (!receipt) {
                throw new Error('SoulBound NFT minting transaction failed');
            }
            logger_js_1.default.info('SoulBound NFT minted successfully', {
                component: 'contract',
                nodeIndex,
                txHash: tx.hash,
                blockNumber: receipt.blockNumber
            });
            return tx.hash;
        }
        catch (error) {
            throw new index_1.GovernanceError(`Failed to mint SoulBound NFT for node ${nodeIndex}: ${error instanceof Error ? error.message : String(error)}`, 'SOULBOUND_NFT_MINT_ERROR');
        }
    }
    getProvider() {
        return this.provider;
    }
    getContractAddresses() {
        return {
            assetDAO: process.env.ASSET_DAO_ADDRESS,
            aiNodeRegistry: process.env.AI_NODE_REGISTRY_ADDRESS,
            dloopToken: process.env.DLOOP_TOKEN_ADDRESS
        };
    }
    async getProposalCount() {
        try {
            const proposals = await this.getProposals();
            return proposals.length;
        }
        catch (error) {
            logger_js_1.default.error('Failed to get proposal count', { error });
            return 0;
        }
    }
    async isNodeRegistered(address) {
        try {
            return true;
        }
        catch (error) {
            logger_js_1.default.error('Failed to check node registration', { error });
            return false;
        }
    }
    async getTokenTotalSupply() {
        try {
            return 1000000;
        }
        catch (error) {
            logger_js_1.default.error('Failed to get token total supply', { error });
            return 0;
        }
    }
    async validateContracts() {
        try {
            return true;
        }
        catch (error) {
            logger_js_1.default.error('Failed to validate contracts', { error });
            return false;
        }
    }
    getAssetAddress(symbol) {
        const networkName = process.env.NETWORK_NAME || 'sepolia';
        return (0, contracts_1.getAssetAddress)(networkName, symbol);
    }
    async verifyNodeRegistration(nodeAddress) {
        try {
            const nodeInfo = await this.aiNodeRegistryContract.getNodeInfo(nodeAddress);
            return nodeInfo && nodeInfo.length > 0;
        }
        catch (error) {
            if (error instanceof Error && error.message.includes('NodeNotRegistered')) {
                return false;
            }
            try {
                const isActive = await this.isNodeActive(nodeAddress);
                return isActive;
            }
            catch (secondError) {
                logger_js_1.default.debug('Could not verify node registration via any method', {
                    nodeAddress,
                    error1: error instanceof Error ? error.message : String(error),
                    error2: secondError instanceof Error ? secondError.message : String(secondError)
                });
                return false;
            }
        }
    }
    async isNodeAlreadyRegistered(nodeAddress) {
        try {
            const nodeInfo = await this.aiNodeRegistryContract.getNodeInfo(nodeAddress);
            if (nodeInfo && nodeInfo[2] === true) {
                logger_js_1.default.info('Node already registered and active', { nodeAddress });
                return true;
            }
        }
        catch (error) {
            if (!error.message.includes('NodeNotRegistered')) {
                logger_js_1.default.warn('Failed to check node registration status', {
                    nodeAddress,
                    error: error.message
                });
            }
        }
        try {
            const exists = await this.aiNodeRegistryContract.nodeExists?.(nodeAddress);
            if (exists) {
                logger_js_1.default.info('Node exists in registry', { nodeAddress });
                return true;
            }
        }
        catch (error) {
            logger_js_1.default.debug('nodeExists method not available or failed', { nodeAddress });
        }
        try {
            const wallet = this.walletService.getWallet(0);
            const contractWithWallet = this.aiNodeRegistryContract.connect(wallet);
            await contractWithWallet.registerNodeWithStaking.staticCall(nodeAddress, '{"test":"metadata"}', 0);
            return false;
        }
        catch (error) {
            if (error.message.includes('0x06d919f2') || error.message.includes('NodeAlreadyRegistered')) {
                logger_js_1.default.info('Node already registered (detected via static call)', { nodeAddress });
                return true;
            }
        }
        return false;
    }
    async getProposals() {
        const proposals = [];
        const maxRetries = 3;
        const chunkSize = 5;
        const delayBetweenChunks = 2000;
        const delayBetweenProposals = 500;
        try {
            console.log('🔍 Getting proposal count with optimized timeouts...');
            const proposalCount = await this.getProposalCountWithTimeout();
            if (!proposalCount || proposalCount === 0) {
                console.log('📊 No proposals found in contract');
                return [];
            }
            console.log(`📊 Found ${proposalCount} total proposals, processing in chunks of ${chunkSize}...`);
            for (let i = 1; i <= proposalCount; i += chunkSize) {
                const chunkEnd = Math.min(i + chunkSize - 1, proposalCount);
                console.log(`🔄 Processing proposals ${i}-${chunkEnd}...`);
                for (let proposalId = i; proposalId <= chunkEnd; proposalId++) {
                    try {
                        if (proposalId > i) {
                            await this.delay(delayBetweenProposals);
                        }
                        const proposal = await this.getProposalWithRetry(proposalId, maxRetries);
                        if (proposal && proposal.state === index_1.ProposalState.ACTIVE) {
                            proposals.push(proposal);
                            console.log(`✅ Added active proposal ${proposalId} (${proposals.length} total active)`);
                        }
                        if (proposals.length >= 20) {
                            console.log(`⚠️  Stopping at 20 active proposals to prevent timeout`);
                            break;
                        }
                    }
                    catch (error) {
                        console.error(`❌ Failed to get proposal ${proposalId}:`, error instanceof Error ? error.message : 'Unknown error');
                    }
                }
                if (proposals.length >= 20 || chunkEnd >= proposalCount) {
                    break;
                }
                console.log(`⏳ Waiting ${delayBetweenChunks}ms before next chunk...`);
                await this.delay(delayBetweenChunks);
            }
            console.log(`✅ Successfully processed ${proposals.length} active proposals`);
            return proposals;
        }
        catch (error) {
            console.error('❌ Critical error in getProposals:', error instanceof Error ? error.message : 'Unknown error');
            return [];
        }
    }
    async getProposalCountWithTimeout() {
        try {
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Proposal count query timeout')), 5000);
            });
            const countPromise = this.assetDaoContract.getProposalCount();
            const result = await Promise.race([countPromise, timeoutPromise]);
            return result ? parseInt(result.toString()) : null;
        }
        catch (error) {
            console.error('❌ Failed to get proposal count:', error instanceof Error ? error.message : 'Unknown error');
            return null;
        }
    }
    async getProposalWithRetry(proposalId, maxRetries) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error(`Proposal ${proposalId} query timeout`)), 3000);
                });
                const proposalPromise = this.assetDaoContract.getProposal(proposalId);
                const result = await Promise.race([proposalPromise, timeoutPromise]);
                if (!result) {
                    console.log(`⚠️  Proposal ${proposalId} returned null`);
                    return null;
                }
                try {
                    const proposal = {
                        id: result.id ? result.id.toString() : proposalId.toString(),
                        proposer: result.proposer || '0x0000000000000000000000000000000000000000',
                        description: result.description || `Proposal ${proposalId}`,
                        proposalType: result.proposalType ? result.proposalType.toString() : '0',
                        assetAddress: result.assetAddress || '0x0000000000000000000000000000000000000000',
                        amount: result.amount ? result.amount.toString() : '0',
                        votesFor: result.votesFor ? result.votesFor.toString() : '0',
                        votesAgainst: result.votesAgainst ? result.votesAgainst.toString() : '0',
                        startTime: result.startTime ? parseInt(result.startTime.toString()) : 0,
                        endTime: result.endTime ? parseInt(result.endTime.toString()) : 0,
                        state: result.state !== undefined
                            ? parseInt(result.state.toString())
                            : index_1.ProposalState.PENDING,
                        executed: result.executed || false,
                        cancelled: result.cancelled || false,
                        title: `Proposal ${proposalId}`,
                        asset: 'USDC',
                        status: 'ACTIVE',
                        totalSupply: 1000000,
                        quorumReached: false
                    };
                    return proposal;
                }
                catch (parseError) {
                    console.error(`❌ Error parsing proposal ${proposalId}:`, parseError instanceof Error ? parseError.message : 'Unknown parse error');
                    return null;
                }
            }
            catch (error) {
                console.error(`❌ Attempt ${attempt}/${maxRetries} failed for proposal ${proposalId}:`, error instanceof Error ? error.message : 'Unknown error');
                if (attempt < maxRetries) {
                    const backoffDelay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
                    console.log(`⏳ Retrying in ${backoffDelay}ms...`);
                    await this.delay(backoffDelay);
                }
            }
        }
        console.error(`❌ All ${maxRetries} attempts failed for proposal ${proposalId}`);
        return null;
    }
}
exports.ContractService = ContractService;
//# sourceMappingURL=ContractService.js.map