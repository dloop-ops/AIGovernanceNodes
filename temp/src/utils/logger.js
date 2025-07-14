"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.testLogger = exports.webLogger = exports.schedulerLogger = exports.nodeLogger = exports.diagnosticLogger = exports.emergencyLogger = exports.systemLogger = exports.marketLogger = exports.strategyLogger = exports.registrationLogger = exports.networkLogger = exports.proposalLogger = exports.votingLogger = exports.walletLogger = exports.contractLogger = exports.governanceLogger = void 0;
const winston_1 = require("winston");
// Base logger configuration
const logger = winston_1.default.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json()),
    transports: [
        new winston_1.default.transports.Console({
            format: winston_1.default.format.simple()
        })
    ]
});
exports.logger = logger;
// Specialized loggers for different components
exports.governanceLogger = logger.child({ component: 'governance' });
exports.contractLogger = logger.child({ component: 'contract' });
exports.walletLogger = logger.child({ component: 'wallet' });
exports.votingLogger = logger.child({ component: 'voting' });
exports.proposalLogger = logger.child({ component: 'proposal' });
exports.networkLogger = logger.child({ component: 'network' });
exports.registrationLogger = logger.child({ component: 'registration' });
exports.strategyLogger = logger.child({ component: 'strategy' });
exports.marketLogger = logger.child({ component: 'market' });
exports.systemLogger = logger.child({ component: 'system' });
exports.emergencyLogger = logger.child({ component: 'emergency' });
exports.diagnosticLogger = logger.child({ component: 'diagnostic' });
exports.nodeLogger = logger.child({ component: 'node' });
exports.schedulerLogger = logger.child({ component: 'scheduler' });
exports.webLogger = logger.child({ component: 'web' });
exports.testLogger = logger.child({ component: 'test' });
exports.default = logger;
