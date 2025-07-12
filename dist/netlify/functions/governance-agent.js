import { ethers } from 'ethers';
export const handler = async (event, context) => {
    console.log('🤖 Netlify Governance Agent Function triggered');
    console.log('⏰ Execution time:', new Date().toISOString());
    console.log('🔧 Event type:', event.httpMethod);
    console.log('🔧 Function path:', event.path);
    console.log('🗳️ STARTING NETLIFY GOVERNANCE AGENT');
    console.log('=====================================');
    console.log('⏰ Start time:', new Date().toISOString());
    try {
        // Environment validation with detailed logging
        console.log('🔍 Checking environment variables...');
        const rpcUrl = process.env.ETHEREUM_RPC_URL;
        const etherscanKey = process.env.ETHERSCAN_API_KEY;
        // Log which environment variables are available (without values)
        console.log('📋 Available environment variables:');
        Object.keys(process.env).forEach(key => {
            if (key.includes('ETHEREUM') || key.includes('AI_NODE') || key.includes('ETHERSCAN')) {
                const hasValue = process.env[key] && process.env[key].length > 0;
                console.log(`   ${key}: ${hasValue ? '✅ SET' : '❌ MISSING'}`);
            }
        });
        // Check critical environment variables
        const missingVars = [];
        if (!rpcUrl) {
            missingVars.push('ETHEREUM_RPC_URL');
        }
        else if (rpcUrl.includes('YOUR_PROJECT_ID') || rpcUrl.includes('YOUR_INFURA_KEY')) {
            missingVars.push('ETHEREUM_RPC_URL (contains placeholder)');
        }
        if (!etherscanKey) {
            missingVars.push('ETHERSCAN_API_KEY');
        }
        // Check for at least one AI node private key
        let hasAnyNodeKey = false;
        for (let i = 1; i <= 5; i++) {
            const nodeKey = process.env[`AI_NODE_${i}_PRIVATE_KEY`];
            if (nodeKey && nodeKey.length > 0 && !nodeKey.includes('YOUR_ACTUAL_PRIVATE_KEY')) {
                hasAnyNodeKey = true;
                break;
            }
        }
        if (!hasAnyNodeKey) {
            missingVars.push('AI_NODE_*_PRIVATE_KEY (at least one)');
        }
        if (missingVars.length > 0) {
            const errorMessage = `Missing required environment variables: ${missingVars.join(', ')}`;
            console.error('❌ Environment validation failed:', errorMessage);
            return {
                statusCode: 503,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'no-cache'
                },
                body: JSON.stringify({
                    success: false,
                    error: errorMessage,
                    missingVariables: missingVars,
                    timestamp: new Date().toISOString(),
                    status: 'configuration_required',
                    instructions: {
                        message: 'Environment variables must be configured in Netlify Dashboard',
                        steps: [
                            '1. Go to Netlify Dashboard → Site Settings → Environment Variables',
                            '2. Add ETHEREUM_RPC_URL with your Infura endpoint',
                            '3. Add ETHERSCAN_API_KEY: HG7DAYXKN5B6AZE35WRDVQRSNN5IDC3ZG6',
                            '4. Add AI_NODE_*_PRIVATE_KEY variables (1-5)',
                            '5. Redeploy the site'
                        ]
                    }
                })
            };
        }
        // Log sanitized URL (hide the key)
        const sanitizedUrl = rpcUrl.replace(/\/v3\/.*$/, '/v3/[HIDDEN]');
        console.log('🌐 Using RPC URL:', sanitizedUrl);
        // Initialize provider with retry logic
        console.log('🔗 Connecting to Ethereum provider...');
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        // Test connection with timeout
        const networkPromise = provider.getNetwork();
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Network connection timeout')), 10000));
        const network = await Promise.race([networkPromise, timeoutPromise]);
        console.log('✅ Connected to network:', network.name, 'Chain ID:', network.chainId.toString());
        // AssetDAO contract setup
        const assetDAOAddress = process.env.ASSET_DAO_CONTRACT_ADDRESS || '0xa87e662061237a121Ca2E83E77dA8251bc4B3529';
        console.log('📋 AssetDAO contract address:', assetDAOAddress);
        // Minimal ABI for fetching proposals
        const assetDAOAbi = [
            "function getProposalCount() external view returns (uint256)",
            "function getProposal(uint256 proposalId) external view returns (uint256 id, uint8 proposalType, address token, uint256 amount, address proposer, uint256 createdAt, uint256 votingEnds, uint256 forVotes, uint256 againstVotes, uint8 state)"
        ];
        const assetDAO = new ethers.Contract(assetDAOAddress, assetDAOAbi, provider);
        // Fetch active proposals
        console.log('📊 Fetching proposal count...');
        const proposalCount = await assetDAO.getProposalCount();
        console.log(`📊 Total proposals: ${proposalCount.toString()}`);
        const activeProposals = [];
        if (Number(proposalCount) === 0) {
            console.log('ℹ️ No proposals exist in the DAO');
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: true,
                    message: 'No proposals exist in the DAO',
                    timestamp: new Date().toISOString()
                })
            };
        }
        // Check recent proposals (last 10 or all if fewer)
        const startId = Math.max(1, Number(proposalCount) - 9);
        console.log(`🔍 Checking proposals ${startId} to ${proposalCount}...`);
        for (let i = startId; i <= Number(proposalCount); i++) {
            try {
                const proposal = await assetDAO.getProposal(i);
                console.log(`📋 Proposal ${i}: State ${proposal.state}, Type ${proposal.proposalType}`);
                // State 1 = Active
                if (proposal.state === 1) {
                    activeProposals.push({
                        id: proposal.id.toString(),
                        proposalType: proposal.proposalType,
                        token: proposal.token,
                        amount: proposal.amount.toString(),
                        proposer: proposal.proposer,
                        votingEnds: new Date(Number(proposal.votingEnds) * 1000).toISOString()
                    });
                    console.log(`✅ Found active proposal ${i}`);
                }
            }
            catch (error) {
                console.log(`⚠️ Could not fetch proposal ${i}:`, error.message);
            }
        }
        if (activeProposals.length === 0) {
            console.log('ℹ️ No active proposals found');
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: true,
                    message: 'No active proposals to vote on',
                    proposalsChecked: Number(proposalCount),
                    timestamp: new Date().toISOString()
                })
            };
        }
        console.log(`🗳️ Found ${activeProposals.length} active proposals`);
        // Log the proposals found
        activeProposals.forEach(proposal => {
            console.log(`📋 Proposal ${proposal.id}: Type ${proposal.proposalType}, Amount: ${proposal.amount}`);
        });
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
};
