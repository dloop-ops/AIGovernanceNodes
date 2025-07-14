"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.governancePlugin = exports.governanceEvaluator = exports.governanceStatusProvider = exports.governanceVoteAction = void 0;
const ethers_1 = require("ethers");
exports.governanceVoteAction = {
    name: "GOVERNANCE_VOTE",
    description: "Analyze governance proposals and execute multi-node voting with conservative strategy",
    handler: async (context) => {
        try {
            const rpcUrl = process.env.ETHEREUM_RPC_URL;
            const contractAddress = process.env.ASSET_DAO_CONTRACT_ADDRESS;
            if (!rpcUrl || !contractAddress) {
                throw new Error('Missing required environment variables');
            }
            const provider = new ethers_1.ethers.JsonRpcProvider(rpcUrl);
            const contractABI = [
                "function getActiveProposals() view returns (tuple(uint256 id, address assetAddress, uint256 amount, string description, uint256 votingEnds)[])",
                "function vote(uint256 proposalId, bool support) external",
                "function getProposalInfo(uint256 proposalId) view returns (tuple(uint256 id, address assetAddress, uint256 amount, string description, uint256 votingEnds, bool executed))",
                "function hasVoted(uint256 proposalId, address voter) view returns (bool)"
            ];
            const contract = new ethers_1.ethers.Contract(contractAddress, contractABI, provider);
            const proposals = await contract.getActiveProposals();
            const votingResults = [];
            for (const proposal of proposals) {
                const votes = await executeMultiNodeVoting(proposal, provider, contract);
                votingResults.push({
                    proposalId: proposal.id,
                    decision: votes.decision,
                    votes: votes.successful,
                    failed: votes.failed
                });
            }
            return {
                success: true,
                action: "GOVERNANCE_VOTE",
                results: votingResults,
                timestamp: new Date().toISOString()
            };
        }
        catch (error) {
            console.error('Governance voting failed:', error);
            return {
                success: false,
                action: "GOVERNANCE_VOTE",
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
};
exports.governanceStatusProvider = {
    name: "GOVERNANCE_STATUS",
    description: "Provides current governance status, active proposals, and voting history",
    get: async (runtime, message) => {
        try {
            const rpcUrl = process.env.ETHEREUM_RPC_URL;
            const contractAddress = process.env.ASSET_DAO_CONTRACT_ADDRESS;
            if (!rpcUrl || !contractAddress) {
                return "⚠️ Governance system not properly configured";
            }
            const provider = new ethers_1.ethers.JsonRpcProvider(rpcUrl);
            const contract = new ethers_1.ethers.Contract(contractAddress, [
                "function getActiveProposals() view returns (tuple(uint256 id, address assetAddress, uint256 amount, string description, uint256 votingEnds)[])"
            ], provider);
            const proposals = await contract.getActiveProposals();
            const activeProposals = [];
            for (let i = 0; i < proposals.length; i++) {
                const proposal = proposals[i];
                const votingEnds = Number(proposal.votingEnds) * 1000;
                if (votingEnds > Date.now()) {
                    activeProposals.push({
                        id: i.toString(),
                        assetAddress: proposal.assetAddress,
                        amount: ethers_1.ethers.formatEther(proposal.amount),
                        description: proposal.description,
                        votingEnds: votingEnds
                    });
                }
            }
            return `📊 **Governance Status**
      
🤖 **System**: Operational
📋 **Active Proposals**: ${activeProposals.length}
🗳️ **Strategy**: Conservative
⏰ **Last Check**: ${new Date().toLocaleString()}

${activeProposals.length > 0 ?
                `📋 **Current Proposals**:\n${activeProposals.map(p => `• Proposal ${p.id}: ${p.description} (${p.amount} USDC)`).join('\n')}` :
                '✅ No active proposals at this time'}`;
        }
        catch (error) {
            return `❌ **Governance Status Error**: ${error instanceof Error ? error.message : String(error)}`;
        }
    }
};
async function executeMultiNodeVoting(proposal, provider, contract) {
    const results = {
        decision: 'ABSTAIN',
        successful: 0,
        failed: 0
    };
    const decision = analyzeProposal(proposal);
    results.decision = decision.vote;
    const transactions = [];
    for (let i = 1; i <= 5; i++) {
        try {
            const privateKey = process.env[`AI_NODE_${i}_PRIVATE_KEY`];
            if (!privateKey)
                continue;
            const wallet = new ethers_1.ethers.Wallet(privateKey, provider);
            const contractWithSigner = contract.connect(wallet);
            const hasVoted = await contract.hasVoted(proposal.id, wallet.address);
            if (hasVoted) {
                console.log(`Node ${i} already voted on proposal ${proposal.id}`);
                continue;
            }
            const tx = await contractWithSigner.vote(proposal.id, decision.support);
            const receipt = await tx.wait();
            if (receipt.status === 1) {
                transactions.push(receipt.hash);
                results.successful++;
                console.log(`✅ Node ${i} voted ${decision.vote} on proposal ${proposal.id}`);
            }
        }
        catch (error) {
            results.failed++;
            console.error(`❌ Node ${i} voting failed:`, error);
        }
    }
    return results;
}
function analyzeProposal(proposal) {
    const amount = parseFloat(ethers_1.ethers.formatEther(proposal.amount));
    const description = proposal.description.toLowerCase();
    const isUSDC = description.includes('usdc') || description.includes('stable');
    if (isUSDC) {
        if (amount <= 5000) {
            return { vote: 'YES', support: true, reasoning: 'Low-risk USDC investment' };
        }
        else if (amount <= 10000) {
            return { vote: 'ABSTAIN', support: false, reasoning: 'Medium-risk: abstaining' };
        }
        else {
            return { vote: 'NO', support: false, reasoning: 'High-risk: amount too large' };
        }
    }
    return { vote: 'NO', support: false, reasoning: 'Non-USDC proposal: too risky' };
}
exports.governanceEvaluator = {
    name: "GOVERNANCE_EVALUATOR",
    description: "Evaluates messages for governance-related content and appropriate responses",
    handler: async (context) => {
        const { message } = context;
        const content = message.content.text.toLowerCase();
        const evaluations = [];
        if (content.includes('proposal') || content.includes('vote') || content.includes('governance')) {
            evaluations.push({
                text: "User is inquiring about governance proposals or voting",
                action: "GOVERNANCE_INQUIRY"
            });
        }
        if (content.includes('status') || content.includes('health') || content.includes('check')) {
            evaluations.push({
                text: "User is requesting system status information",
                action: "STATUS_REQUEST"
            });
        }
        if (content.includes('emergency') || content.includes('urgent') || content.includes('critical')) {
            evaluations.push({
                text: "User may be requesting emergency governance intervention",
                action: "EMERGENCY_REQUEST"
            });
        }
        return {
            evaluations,
            shouldRespond: evaluations.length > 0,
            confidence: evaluations.length > 0 ? 0.8 : 0.1
        };
    }
};
exports.governancePlugin = {
    name: "governance-plugin",
    description: "DLoop governance automation with conservative strategy",
    actions: [exports.governanceVoteAction],
    evaluators: [exports.governanceEvaluator],
    providers: [exports.governanceStatusProvider]
};
exports.default = exports.governancePlugin;
//# sourceMappingURL=index.js.map