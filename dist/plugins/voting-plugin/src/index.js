"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.votingPlugin = exports.votingEvaluator = exports.multiNodeVoteAction = void 0;
exports.multiNodeVoteAction = {
    name: "MULTI_NODE_VOTE",
    description: "Coordinate voting across all 5 AI governance nodes",
    handler: async (context) => {
        try {
            const { proposalId, support, reasoning } = context;
            const results = {
                proposalId,
                decision: support ? 'YES' : 'NO',
                reasoning,
                successful: 0,
                failed: 0,
                transactions: []
            };
            console.log(`🗳️ Coordinating multi-node vote on proposal ${proposalId}: ${results.decision}`);
            return {
                success: true,
                action: "MULTI_NODE_VOTE",
                results,
                timestamp: new Date().toISOString()
            };
        }
        catch (error) {
            console.error('Multi-node voting failed:', error);
            return {
                success: false,
                action: "MULTI_NODE_VOTE",
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
};
exports.votingEvaluator = {
    name: "VOTING_EVALUATOR",
    description: "Evaluates voting-related conversations and coordination needs",
    handler: async (context) => {
        const { message } = context;
        const content = message.content.text.toLowerCase();
        const evaluations = [];
        if (content.includes('vote') || content.includes('voting')) {
            evaluations.push({
                text: "User is discussing voting activities",
                action: "VOTING_INQUIRY"
            });
        }
        if (content.includes('node') || content.includes('multi')) {
            evaluations.push({
                text: "User is asking about multi-node operations",
                action: "NODE_COORDINATION"
            });
        }
        return {
            evaluations,
            shouldRespond: evaluations.length > 0,
            confidence: evaluations.length > 0 ? 0.7 : 0.1
        };
    }
};
exports.votingPlugin = {
    name: "voting-plugin",
    description: "Multi-node voting coordination for DLoop governance",
    actions: [exports.multiNodeVoteAction],
    evaluators: [exports.votingEvaluator]
};
exports.default = exports.votingPlugin;
//# sourceMappingURL=index.js.map