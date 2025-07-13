/**
 * Scheduler utility for governance operations
 * AI Governance Nodes only vote on proposals - they do not create them
 */
import cron from 'node-cron';
import logger from './logger.js';
export class Scheduler {
    nodeManager;
    constructor(nodeManager) {
        this.nodeManager = nodeManager;
    }
    /**
     * Start all scheduled tasks
     */
    start() {
        logger.info('Starting governance scheduler for voting-only operation');
        // AI Governance Nodes do not create proposals - they only vote
        // Proposals are created by Investment Nodes or human participants
        // Voting checks every 8 hours
        cron.schedule('0 */8 * * *', async () => {
            try {
                logger.info('Starting scheduled voting checks');
                await this.nodeManager.checkAndVoteOnProposals();
            }
            catch (error) {
                logger.error('Scheduled voting check failed', { error });
            }
        }, {
            scheduled: true,
            timezone: "UTC"
        });
        // More frequent voting checks during active periods (every 2 hours during business hours)
        cron.schedule('0 8-20/2 * * *', async () => {
            try {
                logger.info('Starting frequent voting checks (business hours)');
                await this.nodeManager.checkAndVoteOnProposals();
            }
            catch (error) {
                logger.error('Frequent voting check failed', { error });
            }
        }, {
            scheduled: true,
            timezone: "UTC"
        });
        logger.info('Governance scheduler started successfully (voting-only operation)');
    }
    /**
     * Stop all scheduled tasks
     */
    stop() {
        logger.info('Stopping governance scheduler');
        cron.destroy();
    }
}
//# sourceMappingURL=scheduler.js.map