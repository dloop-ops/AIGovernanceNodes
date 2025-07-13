import { ethers } from 'ethers';
// Enhanced RPC Manager for Netlify Functions
class NetlifyRpcManager {
    providers = [];
    currentProviderIndex = 0;
    lastRequestTime = 0;
    minRequestInterval = 500; // 0.5 seconds between requests to prevent rate limiting
    constructor() {
        this.initializeProviders();
    }
    initializeProviders() {
        const endpoints = [
            process.env.ETHEREUM_RPC_URL || 'https://sepolia.infura.io/v3/ca485bd6567e4c5fb5693ee66a5885d8',
            'https://sepolia.infura.io/v3/60755064a92543a1ac7aaf4e20b71cdf',
            'https://sepolia.gateway.tenderly.co/public',
            'https://ethereum-sepolia-rpc.publicnode.com'
        ].filter(url => url && !url.includes('undefined'));
        this.providers = endpoints.map(url => new ethers.JsonRpcProvider(url, {
            name: 'sepolia',
            chainId: 11155111
        }));
        console.log(`🔗 Initialized ${this.providers.length} RPC providers`);
    }
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    async enforceRateLimit() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        if (timeSinceLastRequest < this.minRequestInterval) {
            const waitTime = this.minRequestInterval - timeSinceLastRequest;
            await this.delay(waitTime);
        }
        this.lastRequestTime = Date.now();
    }
    async executeWithRetry(operation, maxRetries = 2) {
        let lastError = null;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                await this.enforceRateLimit();
                const provider = this.providers[this.currentProviderIndex];
                const result = await Promise.race([
                    operation(provider),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Operation timeout')), 5000))
                ]);
                return result;
            }
            catch (error) {
                lastError = error;
                const errorMessage = error.message?.toLowerCase() || '';
                // Check for various error types
                const isRateLimit = errorMessage.includes('too many requests') ||
                    errorMessage.includes('rate limit') ||
                    errorMessage.includes('-32005');
                const isABIError = errorMessage.includes('deferred error during abi decoding') ||
                    errorMessage.includes('accessing index 0') ||
                    errorMessage.includes('does not exist or has invalid data');
                const isConnectionError = errorMessage.includes('network') ||
                    errorMessage.includes('timeout') ||
                    errorMessage.includes('connection');
                // Don't retry ABI decoding errors - they indicate the proposal doesn't exist
                if (isABIError) {
                    throw lastError;
                }
                if (isRateLimit || isConnectionError || attempt < maxRetries) {
                    console.log(`⚠️ Request failed (attempt ${attempt}/${maxRetries}): ${error.message?.substring(0, 100)}`);
                    // Rotate to next provider for rate limits or connection issues
                    if (isRateLimit || isConnectionError) {
                        this.currentProviderIndex = (this.currentProviderIndex + 1) % this.providers.length;
                    }
                    // Shorter backoff delays
                    const baseDelay = isRateLimit ? 1000 : 500;
                    const backoffDelay = Math.min(baseDelay * attempt + Math.random() * 500, 3000);
                    await this.delay(backoffDelay);
                }
            }
        }
        throw lastError || new Error('All providers failed');
    }
}
// Simple in-memory cache to prevent concurrent requests
const runningRequests = new Map();
export const handler = async (event, context) => {
    // Create a simple key for deduplication
    const requestKey = `${event.httpMethod}:${event.path}`;
    // If same request is already running, wait for it
    if (runningRequests.has(requestKey)) {
        console.log(`Deduplicating request: ${requestKey}`);
        try {
            return await runningRequests.get(requestKey);
        }
        catch (error) {
            runningRequests.delete(requestKey);
            throw error;
        }
    }
    // Create promise for this request
    const requestPromise = (async () => {
        const startTime = Date.now();
        const requestId = Math.random().toString(36).substring(2, 10);
        const TIMEOUT_LIMIT = 15000; // 15 seconds to leave buffer for response
        try {
            // Main function logic wrapped in a promise with proper timeout handling
            const mainLogicPromise = (async () => {
                console.log(`${requestId} INFO   🤖 Netlify Governance Agent Function triggered`);
                console.log(`${requestId} INFO   ⏰ Execution time: ${new Date().toISOString()}`);
                console.log(`${requestId} INFO   🔧 Event type: ${event.httpMethod}`);
                console.log(`${requestId} INFO   🗳️ STARTING NETLIFY GOVERNANCE AGENT`);
                const rpcUrl = process.env.ETHEREUM_RPC_URL;
                if (!rpcUrl) {
                    return {
                        statusCode: 500,
                        headers: {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        body: JSON.stringify({
                            error: 'Environment configuration error',
                            message: 'Missing ETHEREUM_RPC_URL',
                            timestamp: new Date().toISOString()
                        })
                    };
                }
                // Initialize RPC Manager with shorter timeouts
                const rpcManager = new NetlifyRpcManager();
                // Quick connection test with 3 second timeout
                const network = await Promise.race([
                    rpcManager.executeWithRetry(async (provider) => {
                        return await provider.getNetwork();
                    }, 1), // Only 1 retry
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Network connection timeout')), 3000))
                ]);
                console.log(`${requestId} INFO   ✅ Connected to network: ${network.name}`);
                // AssetDAO contract setup
                const assetDAOAddress = process.env.ASSET_DAO_CONTRACT_ADDRESS || '0xa87e662061237a121Ca2E83E77dA8251bc4B3529';
                const assetDAOABI = [
                    "function getProposalCount() external view returns (uint256)",
                    "function getProposal(uint256) external view returns (uint256, uint8, address, uint256, string, address, uint256, uint256, uint256, uint256, uint8, bool)"
                ];
                // Get proposal count with 3 second timeout
                const proposalCount = await Promise.race([
                    rpcManager.executeWithRetry(async (provider) => {
                        const contract = new ethers.Contract(assetDAOAddress, assetDAOABI, provider);
                        return await contract.getProposalCount();
                    }, 1), // Only 1 retry
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Proposal count timeout')), 3000))
                ]);
                const totalProposals = Number(proposalCount);
                console.log(`${requestId} INFO   📊 Total proposals: ${totalProposals}`);
                if (totalProposals === 0) {
                    return {
                        statusCode: 200,
                        headers: {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        body: JSON.stringify({
                            success: true,
                            message: 'No proposals exist yet',
                            proposalsChecked: 0,
                            timestamp: new Date().toISOString()
                        })
                    };
                }
                // Check last 25 proposals to find active ones (expanded range)
                const startIndex = Math.max(1, totalProposals - 24);
                const endIndex = totalProposals;
                const activeProposals = [];
                console.log(`${requestId} INFO   🔍 Checking proposals ${startIndex} to ${endIndex} (expanded range)...`);
                // Process proposals sequentially with strict time limits
                for (let i = startIndex; i <= endIndex; i++) {
                    try {
                        const proposalResult = await Promise.race([
                            (async () => {
                                try {
                                    const proposalData = await rpcManager.executeWithRetry(async (provider) => {
                                        const contract = new ethers.Contract(assetDAOAddress, assetDAOABI, provider);
                                        return await contract.getProposal(i);
                                    }, 1); // Only 1 retry
                                    // Parse the returned array structure: [id, type, proposer, amount, description, assetAddress, votesFor, votesAgainst, startTime, endTime, state, executed]
                                    const proposer = proposalData[2];
                                    // Quick validation - check if proposer is zero address
                                    if (proposer === '0x0000000000000000000000000000000000000000') {
                                        console.log(`${requestId} WARN   ⚠️ Proposal ${i} has zero address proposer - skipping`);
                                        return null;
                                    }
                                    const proposalState = Number(proposalData[10]); // state is at index 10, convert to number
                                    console.log(`${requestId} INFO   📊 Proposal ${i} state: ${proposalState}`);
                                    // CRITICAL FIX: Proper timestamp handling
                                    const rawEndTime = proposalData[9];
                                    let endTime;
                                    if (typeof rawEndTime === 'bigint') {
                                        endTime = Number(rawEndTime);
                                    }
                                    else {
                                        endTime = Number(rawEndTime);
                                    }
                                    const currentTimeMs = Date.now();
                                    const currentTimeSec = Math.floor(currentTimeMs / 1000);
                                    // FIXED: Better timestamp detection logic
                                    // If endTime is much larger than current timestamp in seconds, it's likely milliseconds
                                    // Use a more conservative threshold: if > year 2030 in seconds, it's probably milliseconds
                                    const year2030InSeconds = 1893456000; // Jan 1, 2030
                                    const isMilliseconds = endTime > year2030InSeconds;
                                    const normalizedEndTime = isMilliseconds ? Math.floor(endTime / 1000) : endTime;
                                    const normalizedCurrentTime = currentTimeSec;
                                    console.log(`${requestId} DEBUG  🕐 Proposal ${i} - Raw endTime: ${endTime}, Normalized: ${normalizedEndTime}, Current: ${normalizedCurrentTime}`);
                                    console.log(`${requestId} DEBUG  📅 Proposal ${i} - End date: ${new Date(normalizedEndTime * 1000).toISOString()}, Current: ${new Date(normalizedCurrentTime * 1000).toISOString()}`);
                                    if (proposalState === 1 || proposalState === 4) { // Active (1) or Pending (4)
                                        // Check if proposal is still within voting period
                                        if (normalizedEndTime > normalizedCurrentTime) {
                                            const timeLeftSeconds = normalizedEndTime - normalizedCurrentTime;
                                            const timeLeftHours = Math.floor(timeLeftSeconds / 3600);
                                            console.log(`${requestId} INFO   ✅ Found ACTIVE proposal ${i} (${timeLeftHours}h ${Math.floor((timeLeftSeconds % 3600) / 60)}m remaining)`);
                                            return {
                                                id: i,
                                                state: proposalState.toString(),
                                                type: proposalData[1].toString(),
                                                description: proposalData[4] || `Proposal ${i}`,
                                                proposer: proposer,
                                                assetAddress: proposalData[5],
                                                amount: proposalData[3].toString(),
                                                startTime: proposalData[8].toString(),
                                                endTime: normalizedEndTime.toString(),
                                                forVotes: proposalData[6].toString(),
                                                againstVotes: proposalData[7].toString(),
                                                timeLeft: timeLeftSeconds
                                            };
                                        }
                                        else {
                                            const expiredSeconds = normalizedCurrentTime - normalizedEndTime;
                                            const expiredHours = Math.floor(expiredSeconds / 3600);
                                            const expiredDays = Math.floor(expiredHours / 24);
                                            if (expiredDays > 0) {
                                                console.log(`${requestId} INFO   ⏰ Proposal ${i} voting period expired ${expiredDays}d ${expiredHours % 24}h ago`);
                                            }
                                            else {
                                                console.log(`${requestId} INFO   ⏰ Proposal ${i} voting period expired ${expiredHours}h ${Math.floor((expiredSeconds % 3600) / 60)}m ago`);
                                            }
                                        }
                                    }
                                    else {
                                        console.log(`${requestId} INFO   ℹ️  Proposal ${i} not active (state: ${proposalState})`);
                                    }
                                    return null;
                                }
                                catch (error) {
                                    console.log(`${requestId} WARN   ⚠️ Proposal ${i}: ${error instanceof Error ? error.message.substring(0, 50) : 'Unknown error'}`);
                                    return null;
                                }
                            })(),
                            new Promise((resolve) => setTimeout(() => resolve(null), 2000) // 2 second timeout per proposal
                            )
                        ]);
                        if (proposalResult) {
                            activeProposals.push(proposalResult);
                        }
                    }
                    catch (error) {
                        console.log(`${requestId} WARN   ⚠️ Skipped proposal ${i} due to timeout`);
                    }
                }
                console.log(`${requestId} INFO   🗳️ Found ${activeProposals.length} active proposals`);
                return {
                    statusCode: 200,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({
                        success: true,
                        message: `Found ${activeProposals.length} active proposals`,
                        proposals: activeProposals,
                        network: {
                            name: network.name,
                            chainId: network.chainId.toString()
                        },
                        timestamp: new Date().toISOString()
                    })
                };
            })();
            // Race between main logic and timeout with proper cleanup
            let timeoutId;
            const timeoutPromise = new Promise((_, reject) => {
                timeoutId = setTimeout(() => {
                    console.log(`${requestId} ERROR  ⏰ Function timeout after ${TIMEOUT_LIMIT / 1000} seconds`);
                    reject(new Error(`Function timeout after ${TIMEOUT_LIMIT / 1000} seconds`));
                }, TIMEOUT_LIMIT);
            });
            try {
                const result = await Promise.race([mainLogicPromise, timeoutPromise]);
                clearTimeout(timeoutId);
                return result;
            }
            catch (error) {
                clearTimeout(timeoutId);
                throw error;
            }
        }
        catch (error) {
            console.error('❌ Error details:', {
                message: error.message,
                code: error.code,
                info: error.info,
                stack: error.stack
            });
            return {
                statusCode: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: false,
                    error: error.message,
                    errorCode: error.code,
                    timestamp: new Date().toISOString(),
                    troubleshooting: 'Check Netlify function logs for detailed error information'
                })
            };
        }
        finally {
            const endTime = Date.now();
            const duration = endTime - startTime;
            console.log(`${requestId} INFO   ⏱️  Execution duration: ${duration}ms`);
            console.log(`${requestId} INFO   =====================================`);
            console.log(`${requestId} INFO   ✅ Netlify Governance Agent Function finished`);
        }
    })();
    // Store the promise
    runningRequests.set(requestKey, requestPromise);
    try {
        const result = await requestPromise;
        runningRequests.delete(requestKey);
        return result;
    }
    catch (error) {
        runningRequests.delete(requestKey);
        throw error;
    }
};
