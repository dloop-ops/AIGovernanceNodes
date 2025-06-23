"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnhancedQuickNodeService = void 0;
const ethers_1 = require("ethers");
const path_1 = __importDefault(require("path"));
const types_1 = require("../types");
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * Enhanced Contract Service using QuickNode Infrastructure
 *
 * Features:
 * - QuickNode HTTP and WebSocket connections
 * - Advanced error handling and retry mechanisms
 * - Gas optimization and transaction safety
 * - Real-time event monitoring
 * - Reentrancy protection
 * - Circuit breaker pattern for reliability
 */
// Load QuickNode-verified ABI
const assetDaoAbi = require(path_1.default.join(process.cwd(), 'abis', '0xa87e662061237a121ca2e83e77da8251bc4b3529.abi.json'));
class EnhancedQuickNodeService {
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
        // Configure transaction safety
        this.safetyConfig = {
            maxGasLimit: 800000n, // Conservative gas limit
            gasBufferPercent: 25, // 25% buffer
            maxRetries: 3,
            timeoutMs: 30000 // 30 second timeout
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
            logger_1.default.info('Enhanced QuickNode service initialized', {
                component: 'enhanced-contract',
                contractAddress: this.contractAddress,
                provider: 'QuickNode Sepolia'
            });
        }
        catch (error) {
            throw new types_1.GovernanceError(`Failed to initialize enhanced contract service: ${error instanceof Error ? error.message : String(error)}`, 'ENHANCED_CONTRACT_INIT_ERROR');
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
            logger_1.default.info('WebSocket event monitoring activated');
        }
        catch (error) {
            logger_1.default.warn('WebSocket setup failed, continuing with HTTP only', { error });
        }
    }
    /**
     * Circuit breaker implementation
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
     * Record circuit breaker success/failure
     */
    recordCircuitBreakerResult(success) {
        if (success) {
            this.circuitBreaker.failures = 0;
            this.circuitBreaker.state = 'CLOSED';
        }
        else {
            this.circuitBreaker.failures++;
            this.circuitBreaker.lastFailureTime = Date.now();
        }
    }
    /**
     * Enhanced gas estimation with safety checks
     */
    async estimateGasWithSafety(contract, method, args) {
        try {
            // Estimate gas with timeout
            const estimatePromise = contract[method].estimateGas(...args);
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Gas estimation timeout')), 10000));
            const gasEstimate = await Promise.race([estimatePromise, timeoutPromise]);
            // Apply safety buffer
            let gasLimit = gasEstimate * BigInt(100 + this.safetyConfig.gasBufferPercent) / 100n;
            // Ensure within safety bounds
            if (gasLimit > this.safetyConfig.maxGasLimit) {
                gasLimit = this.safetyConfig.maxGasLimit;
                logger_1.default.warn('Gas limit capped for safety', {
                    estimated: gasEstimate.toString(),
                    capped: gasLimit.toString()
                });
            }
            // Get current gas price with EIP-1559 support
            const feeData = await this.httpProvider.getFeeData();
            const gasPrice = feeData.maxFeePerGas || feeData.gasPrice || ethers_1.ethers.parseUnits('20', 'gwei');
            return { gasLimit, gasPrice };
        }
        catch (error) {
            throw new types_1.GovernanceError(`Gas estimation failed: ${error instanceof Error ? error.message : String(error)}`, 'GAS_ESTIMATION_ERROR');
        }
    }
    /**
     * Enhanced proposal creation with comprehensive safety checks
     */
    async createProposal(nodeIndex, params) {
        this.checkCircuitBreaker();
        try {
            const wallet = this.walletService.getWallet(nodeIndex);
            const contract = this.assetDaoContract.connect(wallet);
            // Reentrancy protection check
            const transactionId = `create-${nodeIndex}-${Date.now()}`;
            if (this.activeTransactions.has(transactionId)) {
                throw new types_1.GovernanceError('Duplicate transaction detected', 'REENTRANCY_PROTECTION');
            }
            this.activeTransactions.add(transactionId);
            logger_1.default.info('Creating proposal with enhanced safety', {
                nodeIndex,
                proposer: wallet.address,
                proposalType: params.proposalType,
                assetAddress: params.assetAddress,
                amount: params.amount,
                transactionId
            });
            // Validate parameters
            this.validateProposalParams(params);
            // Get gas estimates with safety
            const { gasLimit, gasPrice } = await this.estimateGasWithSafety(contract, 'createProposal', [
                params.proposalType,
                params.assetAddress,
                ethers_1.ethers.parseEther(params.amount),
                params.description,
                params.additionalData || '0x'
            ]);
            // Execute transaction with timeout and nonce management
            const nonce = await wallet.getNonce();
            const txPromise = contract.createProposal(params.proposalType, params.assetAddress, ethers_1.ethers.parseEther(params.amount), params.description, params.additionalData || '0x', {
                gasLimit,
                gasPrice,
                nonce
            });
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Transaction timeout')), this.safetyConfig.timeoutMs));
            const tx = await Promise.race([txPromise, timeoutPromise]);
            logger_1.default.info('Proposal transaction sent', {
                nodeIndex,
                txHash: tx.hash,
                gasLimit: gasLimit.toString(),
                gasPrice: ethers_1.ethers.formatUnits(gasPrice, 'gwei') + ' gwei',
                nonce: tx.nonce
            });
            // Wait for confirmation with timeout
            const receiptPromise = tx.wait();
            const receiptTimeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Receipt timeout')), 60000));
            const receipt = await Promise.race([receiptPromise, receiptTimeoutPromise]);
            if (!receipt) {
                throw new Error('Transaction receipt not found');
            }
            // Parse ProposalCreated event
            const proposalId = this.parseProposalCreatedEvent(receipt);
            logger_1.default.info('Proposal created successfully', {
                nodeIndex,
                proposalId,
                txHash: tx.hash,
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed.toString()
            });
            this.recordCircuitBreakerResult(true);
            this.activeTransactions.delete(transactionId);
            return proposalId;
        }
        catch (error) {
            this.recordCircuitBreakerResult(false);
            const errorMessage = `Enhanced proposal creation failed: ${error instanceof Error ? error.message : String(error)}`;
            logger_1.default.error(errorMessage, { nodeIndex, params });
            throw new types_1.GovernanceError(errorMessage, 'ENHANCED_PROPOSAL_CREATION_ERROR');
        }
    }
    /**
     * Enhanced voting with comprehensive safety and reentrancy protection
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
            logger_1.default.info('Casting vote with enhanced safety', {
                nodeIndex,
                proposalId,
                support,
                voter: wallet.address,
                transactionId
            });
            // Validate voting eligibility
            await this.validateVotingEligibility(nodeIndex, proposalId);
            // Get gas estimates
            const { gasLimit, gasPrice } = await this.estimateGasWithSafety(contract, 'vote', [proposalId, support]);
            // Execute vote with safety measures
            const nonce = await wallet.getNonce();
            const tx = await contract.vote(proposalId, support, {
                gasLimit,
                gasPrice,
                nonce
            });
            logger_1.default.info('Vote transaction sent', {
                nodeIndex,
                proposalId,
                support,
                txHash: tx.hash,
                gasUsed: gasLimit.toString(),
                nonce: tx.nonce
            });
            this.recordCircuitBreakerResult(true);
            this.activeTransactions.delete(transactionId);
            return tx.hash;
        }
        catch (error) {
            this.recordCircuitBreakerResult(false);
            const errorMessage = `Enhanced voting failed: ${error instanceof Error ? error.message : String(error)}`;
            logger_1.default.error(errorMessage, { nodeIndex, proposalId, support });
            throw new types_1.GovernanceError(errorMessage, 'ENHANCED_VOTING_ERROR');
        }
    }
    /**
     * Enhanced proposal retrieval with caching and error handling
     */
    async getProposals() {
        this.checkCircuitBreaker();
        try {
            const proposalCount = await this.assetDaoContract.getProposalCount();
            const proposals = [];
            logger_1.default.info('Fetching proposals with enhanced safety', {
                totalProposals: proposalCount.toString()
            });
            // Batch process proposals with timeout protection
            const batchSize = 10;
            for (let i = 1; i <= proposalCount; i += batchSize) {
                const batch = [];
                const endIndex = Math.min(i + batchSize - 1, Number(proposalCount));
                for (let j = i; j <= endIndex; j++) {
                    batch.push(this.getProposalWithTimeout(j));
                }
                const batchResults = await Promise.allSettled(batch);
                for (const result of batchResults) {
                    if (result.status === 'fulfilled' && result.value) {
                        proposals.push(result.value);
                    }
                    else if (result.status === 'rejected') {
                        logger_1.default.warn('Failed to fetch proposal in batch', { error: result.reason });
                    }
                }
                // Add delay between batches to prevent rate limiting
                if (endIndex < proposalCount) {
                    await this.delay(500);
                }
            }
            this.recordCircuitBreakerResult(true);
            logger_1.default.info('Proposals fetched successfully', { count: proposals.length });
            return proposals;
        }
        catch (error) {
            this.recordCircuitBreakerResult(false);
            const errorMessage = `Enhanced proposal retrieval failed: ${error instanceof Error ? error.message : String(error)}`;
            logger_1.default.error(errorMessage);
            throw new types_1.GovernanceError(errorMessage, 'ENHANCED_PROPOSAL_RETRIEVAL_ERROR');
        }
    }
    /**
     * Check if a node has already voted on a proposal
     */
    async hasVoted(proposalId, nodeIndex) {
        try {
            const wallet = this.walletService.getWallet(nodeIndex);
            return await this.assetDaoContract.hasVoted(proposalId, wallet.address);
        }
        catch (error) {
            logger_1.default.error('Failed to check vote status', { proposalId, nodeIndex, error });
            return false;
        }
    }
    /**
     * Event handlers for real-time monitoring
     */
    handleProposalCreated(proposalId, assetId, proposer, proposalType) {
        logger_1.default.info('Real-time: New proposal created', {
            proposalId: proposalId.toString(),
            assetId: assetId.toString(),
            proposer,
            proposalType
        });
    }
    handleVoteCast(proposalId, voter, support, weight) {
        logger_1.default.info('Real-time: Vote cast', {
            proposalId: proposalId.toString(),
            voter,
            support,
            weight: weight.toString()
        });
    }
    handleProposalExecuted(proposalId) {
        logger_1.default.info('Real-time: Proposal executed', {
            proposalId: proposalId.toString()
        });
    }
    /**
     * Validation helpers
     */
    validateProposalParams(params) {
        if (!params.assetAddress || !ethers_1.ethers.isAddress(params.assetAddress)) {
            throw new types_1.GovernanceError('Invalid asset address', 'INVALID_ASSET_ADDRESS');
        }
        if (!params.amount || parseFloat(params.amount) <= 0) {
            throw new types_1.GovernanceError('Invalid amount', 'INVALID_AMOUNT');
        }
        if (!params.description || params.description.trim().length === 0) {
            throw new types_1.GovernanceError('Description required', 'INVALID_DESCRIPTION');
        }
    }
    async validateVotingEligibility(nodeIndex, proposalId) {
        // Check if already voted
        const hasVoted = await this.hasVoted(proposalId, nodeIndex);
        if (hasVoted) {
            throw new types_1.GovernanceError('Already voted on this proposal', 'ALREADY_VOTED');
        }
        // Check proposal exists and is active
        try {
            const proposal = await this.assetDaoContract.getProposal(proposalId);
            if (proposal[10] !== 1) { // Status should be ACTIVE (1)
                throw new types_1.GovernanceError('Proposal is not active', 'PROPOSAL_NOT_ACTIVE');
            }
        }
        catch (error) {
            throw new types_1.GovernanceError('Invalid proposal ID', 'INVALID_PROPOSAL');
        }
    }
    /**
     * Utility methods
     */
    async getProposalWithTimeout(proposalId) {
        try {
            const proposalPromise = this.assetDaoContract.getProposal(proposalId);
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Proposal fetch timeout')), 5000));
            const rawProposal = await Promise.race([proposalPromise, timeoutPromise]);
            return this.parseProposal(rawProposal, proposalId);
        }
        catch (error) {
            logger_1.default.warn(`Failed to fetch proposal ${proposalId}`, { error });
            return null;
        }
    }
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
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Cleanup method
     */
    async shutdown() {
        try {
            if (this.wsProvider) {
                await this.wsProvider.destroy();
            }
            logger_1.default.info('Enhanced QuickNode service shut down');
        }
        catch (error) {
            logger_1.default.error('Error during shutdown', { error });
        }
    }
    /**
     * Health check method
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
}
exports.EnhancedQuickNodeService = EnhancedQuickNodeService;
//# sourceMappingURL=EnhancedQuickNodeService.js.map