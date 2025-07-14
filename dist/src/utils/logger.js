"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.nodeLogger = exports.walletLogger = exports.strategyLogger = exports.contractLogger = exports.governanceLogger = void 0;
const winston_1 = __importDefault(require("winston"));
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
exports.governanceLogger = logger.child({ component: 'governance' });
exports.contractLogger = winston_1.default.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json()),
    defaultMeta: { service: 'contract-service' },
    transports: [
        new winston_1.default.transports.File({ filename: 'logs/contract-error.log', level: 'error' }),
        new winston_1.default.transports.File({ filename: 'logs/contract-combined.log' }),
        new winston_1.default.transports.Console({
            format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple())
        })
    ]
});
exports.strategyLogger = winston_1.default.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json()),
    defaultMeta: { service: 'strategy-service' },
    transports: [
        new winston_1.default.transports.File({ filename: 'logs/strategy-error.log', level: 'error' }),
        new winston_1.default.transports.File({ filename: 'logs/strategy-combined.log' }),
        new winston_1.default.transports.Console({
            format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple())
        })
    ]
});
exports.walletLogger = logger.child({ component: 'wallet' });
exports.nodeLogger = logger.child({ component: 'node' });
exports.default = logger;
//# sourceMappingURL=logger.js.map