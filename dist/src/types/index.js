"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProposalState = exports.ProposalType = exports.GovernanceError = exports.NodeStrategy = void 0;
var NodeStrategy;
(function (NodeStrategy) {
    NodeStrategy["BALANCED"] = "BALANCED";
    NodeStrategy["AGGRESSIVE"] = "AGGRESSIVE";
    NodeStrategy["CONSERVATIVE"] = "CONSERVATIVE";
})(NodeStrategy || (exports.NodeStrategy = NodeStrategy = {}));
class GovernanceError extends Error {
    constructor(message, code, details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'GovernanceError';
    }
}
exports.GovernanceError = GovernanceError;
var ProposalType;
(function (ProposalType) {
    ProposalType[ProposalType["INVEST"] = 0] = "INVEST";
    ProposalType[ProposalType["DIVEST"] = 1] = "DIVEST";
    ProposalType[ProposalType["REBALANCE"] = 2] = "REBALANCE";
})(ProposalType || (exports.ProposalType = ProposalType = {}));
var ProposalState;
(function (ProposalState) {
    ProposalState[ProposalState["PENDING"] = 0] = "PENDING";
    ProposalState[ProposalState["ACTIVE"] = 1] = "ACTIVE";
    ProposalState[ProposalState["SUCCEEDED"] = 2] = "SUCCEEDED";
    ProposalState[ProposalState["DEFEATED"] = 3] = "DEFEATED";
    ProposalState[ProposalState["QUEUED"] = 4] = "QUEUED";
    ProposalState[ProposalState["EXECUTED"] = 5] = "EXECUTED";
    ProposalState[ProposalState["CANCELLED"] = 6] = "CANCELLED";
})(ProposalState || (exports.ProposalState = ProposalState = {}));
//# sourceMappingURL=index.js.map