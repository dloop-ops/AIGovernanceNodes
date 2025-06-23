import { createLogger, format, transports } from 'winston';
import { join } from 'path';
// Create logs directory if it doesn't exist
const logDir = 'logs';
// Custom BigInt serialization replacer
const bigintReplacer = (key, value) => {
    if (typeof value === 'bigint') {
        return value.toString();
    }
    // Handle error objects that might contain BigInt values
    if (value instanceof Error) {
        return {
            name: value.name,
            message: value.message,
            stack: value.stack
        };
    }
    // Handle objects that might contain BigInt values
    if (value && typeof value === 'object' && value.constructor === Object) {
        const cleanObj = {};
        for (const [k, v] of Object.entries(value)) {
            if (typeof v === 'bigint') {
                cleanObj[k] = v.toString();
            }
            else {
                cleanObj[k] = v;
            }
        }
        return cleanObj;
    }
    return value;
};
// Custom format to handle BigInt serialization
const bigintFormat = format((info) => {
    // Convert the entire info object to properly handle BigInt values
    const serialized = JSON.stringify(info, bigintReplacer);
    return JSON.parse(serialized);
});
const logger = createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: format.combine(bigintFormat(), // Apply BigInt handling first
    format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
    }), format.errors({ stack: true }), format.json()),
    defaultMeta: { service: 'governance-nodes' },
    transports: [
        // Write all logs with level 'error' and below to error.log
        new transports.File({
            filename: join(logDir, 'error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),
        // Write all logs with level 'info' and below to combined.log
        new transports.File({
            filename: join(logDir, 'combined.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),
        // Write governance activities to separate log
        new transports.File({
            filename: join(logDir, 'governance.log'),
            level: 'info',
            maxsize: 5242880, // 5MB
            maxFiles: 10
        })
    ]
});
// If we're not in production, log to the console as well
if (process.env.NODE_ENV !== 'production') {
    logger.add(new transports.Console({
        format: format.combine(bigintFormat(), // Apply BigInt handling for console too
        format.colorize(), format.simple(), format.printf(({ timestamp, level, message, service, nodeId, ...meta }) => {
            const nodeInfo = nodeId ? `[${nodeId}]` : '';
            const metaString = Object.keys(meta).length ? JSON.stringify(meta, bigintReplacer, 2) : '';
            return `${timestamp} [${service}]${nodeInfo} ${level}: ${message} ${metaString}`;
        }))
    }));
}
// Create specialized loggers for different components
export const governanceLogger = logger.child({ component: 'governance' });
export const marketDataLogger = logger.child({ component: 'market-data' });
export const contractLogger = logger.child({ component: 'contract' });
export const walletLogger = logger.child({ component: 'wallet' });
export const strategyLogger = logger.child({ component: 'strategy' });
// Export the bigintReplacer for use in other parts of the application
export { bigintReplacer };
export default logger;
//# sourceMappingURL=logger.js.map