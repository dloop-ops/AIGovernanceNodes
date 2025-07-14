import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

export const governanceLogger = logger.child({ component: 'governance' });
export const contractLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'contract-service' },
  transports: [
    new winston.transports.File({ filename: 'logs/contract-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/contract-combined.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

export const strategyLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'strategy-service' },
  transports: [
    new winston.transports.File({ filename: 'logs/strategy-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/strategy-combined.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});
export const walletLogger = logger.child({ component: 'wallet' });
export const nodeLogger = logger.child({ component: 'node' });

export default logger;
export { logger };