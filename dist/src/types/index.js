export var ProposalType;
(function (ProposalType) {
    ProposalType[ProposalType["INVEST"] = 0] = "INVEST";
    ProposalType[ProposalType["DIVEST"] = 1] = "DIVEST";
    ProposalType[ProposalType["REBALANCE"] = 2] = "REBALANCE";
})(ProposalType || (ProposalType = {}));
export var ProposalState;
(function (ProposalState) {
    ProposalState[ProposalState["PENDING"] = 0] = "PENDING";
    ProposalState[ProposalState["ACTIVE"] = 1] = "ACTIVE";
    ProposalState[ProposalState["SUCCEEDED"] = 2] = "SUCCEEDED";
    ProposalState[ProposalState["DEFEATED"] = 3] = "DEFEATED";
    ProposalState[ProposalState["QUEUED"] = 4] = "QUEUED";
    ProposalState[ProposalState["EXECUTED"] = 5] = "EXECUTED";
    ProposalState[ProposalState["CANCELLED"] = 6] = "CANCELLED";
})(ProposalState || (ProposalState = {}));
// Error Types
export class GovernanceError extends Error {
    code;
    constructor(message, code = 'GOVERNANCE_ERROR') {
        super(message);
        this.name = 'GovernanceError';
        this.code = code;
        // Maintain proper stack trace
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, GovernanceError);
        }
    }
}
//# sourceMappingURL=index.js.map