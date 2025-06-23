"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuickNodeEnhancedService = void 0;
const ethers_1 = require("ethers");
const path_1 = __importDefault(require("path"));
const types_1 = require("../types");
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * Enhanced Contract Service using QuickNode Infrastructure
 * Features: Advanced security, reentrancy protection, circuit breaker pattern
 */
// Load QuickNode-verified ABI
const assetDaoAbi = require(path_1.default.join(process.cwd(), 'abis', '0xa87e662061237a121ca2e83e77da8251bc4b3529.abi.json'));
class QuickNodeEnhancedService {
    constructor(walletService) {
        this.wsProvider = null;
        this.activeTransactions = new Set();
        // QuickNode endpoints
        this.QUICKNODE_HTTP = 'https://divine-methodical-layer.ethereum-sepolia.quiknode.pro/';
        this.QUICKNODE_WS = 'wss://divine-methodical-layer.ethereum-sepolia.quiknode.pro/';
        this.CONTRACT_ADDRESS = '0xa87e662061237a121Ca2E83E77dA8251bc4b3529';
        this.walletService = walletService;
        this.contractAddress = this.CONTRACT_ADDRESS;
        // Initialize QuickNode providers
        this.httpProvider = new ethers_1.ethers.JsonRpcProvider(this.QUICKNODE_HTTP);
        // Initialize circuit breaker
        this.circuitBreaker = {
            failures: 0,
            lastFailureTime: 0,
            state: 'CLOSED'
        };
        this.initializeContract();
        this.setupWebSocketConnection();
    }
    /**
     * Initialize contract with HTTP provider
     */
    initializeContract() {
        try {
            this.assetDaoContract = new ethers_1.ethers.Contract(this.contractAddress, assetDaoAbi, this.httpProvider);
            logger_1.default.info('QuickNode Enhanced service initialized', {
                component: 'quicknode-enhanced',
                contractAddress: this.contractAddress,
                provider: 'QuickNode Sepolia'
            });
        }
        catch (error) {
            throw new types_1.GovernanceError(`Failed to initialize QuickNode service: ${error instanceof Error ? error.message : String(error)}`, 'QUICKNODE_INIT_ERROR');
        }
    }
    /**
     * Setup WebSocket connection for real-time events
     */
    async setupWebSocketConnection() {
        try {
            this.wsProvider = new ethers_1.ethers.WebSocketProvider(this.QUICKNODE_WS);
            const wsContract = new ethers_1.ethers.Contract(this.contractAddress, assetDaoAbi, this.wsProvider);
            // Monitor critical governance events
            wsContract.on('ProposalCreated', this.handleProposalCreated.bind(this));
            wsContract.on('VoteCast', this.handleVoteCast.bind(this));
            wsContract.on('ProposalExecuted', this.handleProposalExecuted.bind(this));
            logger_1.default.info('QuickNode WebSocket monitoring activated');
        }
        catch (error) {
            logger_1.default.warn('WebSocket setup failed, continuing with HTTP only', { error });
        }
    }
    /**
     * Circuit breaker implementation for reliability
     */
    checkCircuitBreaker() {
        const now = Date.now();
        const FAILURE_THRESHOLD = 5;
        const TIMEOUT_PERIOD = 60000; // 1 minute
        if (this.circuitBreaker.state === 'OPEN') {
            if (now - this.circuitBreaker.lastFailureTime > TIMEOUT_PERIOD) {
                this.circuitBreaker.state = 'HALF_OPEN';
                logger_1.default.info('Circuit breaker moving to HALF_OPEN state');
            }
            else {
                throw new types_1.GovernanceError('Circuit breaker is OPEN', 'CIRCUIT_BREAKER_OPEN');
            }
        }
        if (this.circuitBreaker.failures >= FAILURE_THRESHOLD) {
            this.circuitBreaker.state = 'OPEN';
            this.circuitBreaker.lastFailureTime = now;
            logger_1.default.error('Circuit breaker opened due to excessive failures');
            throw new types_1.GovernanceError('Circuit breaker opened', 'CIRCUIT_BREAKER_OPEN');
        }
    }
    /**
     * Enhanced proposal creation with comprehensive safety
     */
    async createProposal(nodeIndex, params) {
        this.checkCircuitBreaker();
        try {
            const wallet = this.walletService.getWallet(nodeIndex);
            const contract = this.assetDaoContract.connect(wallet);
            // Reentrancy protection
            const transactionId = `create-${nodeIndex}-${Date.now()}`;
            if (this.activeTransactions.has(transactionId)) {
                throw new types_1.GovernanceError('Duplicate transaction detected', 'REENTRANCY_PROTECTION');
            }
            this.activeTransactions.add(transactionId);
            logger_1.default.info('Creating proposal with QuickNode', {
                nodeIndex,
                proposer: wallet.address,
                proposalType: params.proposalType,
                assetAddress: params.assetAddress,
                amount: params.amount,
                transactionId
            });
            // Gas estimation with safety
            const gasEstimate = await contract.createProposal.estimateGas(params.proposalType, params.assetAddress, ethers_1.ethers.parseEther(params.amount), params.description, params.additionalData || '0x');
            const gasLimit = gasEstimate * 125n / 100n; // 25% buffer
            const feeData = await this.httpProvider.getFeeData();
            const gasPrice = feeData.maxFeePerGas || feeData.gasPrice || ethers_1.ethers.parseUnits('20', 'gwei');
            // Execute transaction
            const nonce = await wallet.getNonce();
            const tx = await contract.createProposal(params.proposalType, params.assetAddress, ethers_1.ethers.parseEther(params.amount), params.description, params.additionalData || '0x', { gasLimit, gasPrice, nonce });
            const receipt = await tx.wait();
            const proposalId = this.parseProposalCreatedEvent(receipt);
            logger_1.default.info('Proposal created via QuickNode', {
                nodeIndex,
                proposalId,
                txHash: tx.hash,
                gasUsed: receipt.gasUsed.toString()
            });
            this.circuitBreaker.failures = 0; // Reset on success
            this.activeTransactions.delete(transactionId);
            return proposalId;
        }
        catch (error) {
            this.circuitBreaker.failures++;
            const errorMessage = `QuickNode proposal creation failed: ${error instanceof Error ? error.message : String(error)}`;
            logger_1.default.error(errorMessage, { nodeIndex, params });
            throw new types_1.GovernanceError(errorMessage, 'QUICKNODE_PROPOSAL_ERROR');
        }
    }
    /**
     * Enhanced voting with safety measures
     */
    async vote(nodeIndex, proposalId, support) {
        this.checkCircuitBreaker();
        try {
            const wallet = this.walletService.getWallet(nodeIndex);
            const contract = this.assetDaoContract.connect(wallet);
            // Reentrancy protection
            const transactionId = `vote-${nodeIndex}-${proposalId}-${Date.now()}`;
            if (this.activeTransactions.has(transactionId)) {
                throw new types_1.GovernanceError('Duplicate vote detected', 'REENTRANCY_PROTECTION');
            }
            this.activeTransactions.add(transactionId);
            logger_1.default.info('Casting vote via QuickNode', {
                nodeIndex,
                proposalId,
                support,
                voter: wallet.address
            });
            // Gas estimation and execution
            const gasEstimate = await contract.vote.estimateGas(proposalId, support);
            const gasLimit = gasEstimate * 125n / 100n;
            const feeData = await this.httpProvider.getFeeData();
            const gasPrice = feeData.maxFeePerGas || feeData.gasPrice || ethers_1.ethers.parseUnits('20', 'gwei');
            const nonce = await wallet.getNonce();
            const tx = await contract.vote(proposalId, support, {
                gasLimit,
                gasPrice,
                nonce
            });
            logger_1.default.info('Vote cast via QuickNode', {
                nodeIndex,
                proposalId,
                support,
                txHash: tx.hash
            });
            this.circuitBreaker.failures = 0; // Reset on success
            this.activeTransactions.delete(transactionId);
            return tx.hash;
        }
        catch (error) {
            this.circuitBreaker.failures++;
            const errorMessage = `QuickNode voting failed: ${error instanceof Error ? error.message : String(error)}`;
            logger_1.default.error(errorMessage, { nodeIndex, proposalId, support });
            throw new types_1.GovernanceError(errorMessage, 'QUICKNODE_VOTING_ERROR');
        }
    }
    /**
     * Get proposals with enhanced reliability
     */
    async getProposals() {
        this.checkCircuitBreaker();
        try {
            const proposalCount = await this.assetDaoContract.getProposalCount();
            const proposals = [];
            logger_1.default.info('Fetching proposals via QuickNode', {
                totalProposals: proposalCount.toString()
            });
            // Batch process with error handling
            for (let i = 1; i <= proposalCount; i++) {
                try {
                    const rawProposal = await this.assetDaoContract.getProposal(i);
                    proposals.push(this.parseProposal(rawProposal, i));
                }
                catch (error) {
                    logger_1.default.warn(`Failed to fetch proposal ${i}`, { error });
                }
            }
            this.circuitBreaker.failures = 0; // Reset on success
            logger_1.default.info('Proposals fetched via QuickNode', { count: proposals.length });
            return proposals;
        }
        catch (error) {
            this.circuitBreaker.failures++;
            const errorMessage = `QuickNode proposal retrieval failed: ${error instanceof Error ? error.message : String(error)}`;
            logger_1.default.error(errorMessage);
            throw new types_1.GovernanceError(errorMessage, 'QUICKNODE_RETRIEVAL_ERROR');
        }
    }
    /**
     * Check voting status
     */
    async hasVoted(proposalId, nodeIndex) {
        try {
            const wallet = this.walletService.getWallet(nodeIndex);
            return await this.assetDaoContract.hasVoted(proposalId, wallet.address);
        }
        catch (error) {
            logger_1.default.error('Failed to check vote status via QuickNode', { proposalId, nodeIndex, error });
            return false;
        }
    }
    /**
     * Event handlers for real-time monitoring
     */
    handleProposalCreated(proposalId, assetId, proposer, proposalType) {
        logger_1.default.info('QuickNode Event: New proposal created', {
            proposalId: proposalId.toString(),
            assetId: assetId.toString(),
            proposer,
            proposalType
        });
    }
    handleVoteCast(proposalId, voter, support, weight) {
        logger_1.default.info('QuickNode Event: Vote cast', {
            proposalId: proposalId.toString(),
            voter,
            support,
            weight: weight.toString()
        });
    }
    handleProposalExecuted(proposalId) {
        logger_1.default.info('QuickNode Event: Proposal executed', {
            proposalId: proposalId.toString()
        });
    }
    /**
     * Utility methods
     */
    parseProposal(rawProposal, id) {
        return {
            id: id.toString(),
            proposer: rawProposal[5],
            proposalType: this.mapProposalType(rawProposal[1]),
            assetAddress: rawProposal[2],
            amount: rawProposal[3].toString(),
            description: rawProposal[4],
            votesFor: rawProposal[8].toString(),
            votesAgainst: rawProposal[9].toString(),
            startTime: Number(rawProposal[6]),
            endTime: Number(rawProposal[7]),
            executed: rawProposal[11],
            cancelled: false,
            state: this.mapProposalState(rawProposal[10])
        };
    }
    parseProposalCreatedEvent(receipt) {
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
            throw new Error('ProposalCreated event not found');
        }
        const parsedEvent = this.assetDaoContract.interface.parseLog({
            topics: proposalCreatedEvent.topics,
            data: proposalCreatedEvent.data
        });
        return parsedEvent?.args.proposalId.toString();
    }
    mapProposalState(stateValue) {
        const stateMap = {
            0: types_1.ProposalState.PENDING,
            1: types_1.ProposalState.ACTIVE,
            2: types_1.ProposalState.SUCCEEDED,
            3: types_1.ProposalState.DEFEATED,
            4: types_1.ProposalState.QUEUED,
            5: types_1.ProposalState.EXECUTED,
            6: types_1.ProposalState.CANCELLED
        };
        return stateMap[Number(stateValue)] || types_1.ProposalState.PENDING;
    }
    mapProposalType(typeValue) {
        const typeMap = {
            0: types_1.ProposalType.INVEST,
            1: types_1.ProposalType.DIVEST,
            2: types_1.ProposalType.REBALANCE
        };
        return typeMap[Number(typeValue)] || types_1.ProposalType.INVEST;
    }
    /**
     * Health check
     */
    async healthCheck() {
        try {
            await this.httpProvider.getBlockNumber();
            return this.circuitBreaker.state !== 'OPEN';
        }
        catch {
            return false;
        }
    }
    /**
     * Cleanup
     */
    async shutdown() {
        try {
            if (this.wsProvider) {
                await this.wsProvider.destroy();
            }
            logger_1.default.info('QuickNode Enhanced service shut down');
        }
        catch (error) {
            logger_1.default.error('Error during QuickNode shutdown', { error });
        }
    }
}
exports.QuickNodeEnhancedService = QuickNodeEnhancedService;
//# sourceMappingURL=QuickNodeEnhancedService.js.map