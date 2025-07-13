import * as cron from 'node-cron';
import logger from './logger.js';
export class Scheduler {
    tasks = new Map();
    constructor() {
        logger.info('Scheduler initialized');
    }
    addTask(name, schedule, taskFunction) {
        try {
            // Remove existing task if it exists
            if (this.tasks.has(name)) {
                this.stopTask(name);
            }
            // Create the scheduled task using node-cron
            const task = cron.schedule(schedule, async () => {
                const scheduledTask = this.tasks.get(name);
                if (!scheduledTask)
                    return;
                if (scheduledTask.isRunning) {
                    logger.warn(`Task "${name}" is already running, skipping this execution`);
                    return;
                }
                try {
                    scheduledTask.isRunning = true;
                    logger.info(`Starting scheduled task: ${name}`);
                    await taskFunction();
                    logger.info(`Completed scheduled task: ${name}`);
                }
                catch (error) {
                    logger.error(`Error in scheduled task "${name}":`, error);
                }
                finally {
                    scheduledTask.isRunning = false;
                }
            }, {
                timezone: 'UTC'
            });
            // Store the task
            this.tasks.set(name, {
                name,
                schedule,
                task,
                isRunning: false
            });
            logger.info(`Added scheduled task "${name}" with schedule: ${schedule}`);
        }
        catch (error) {
            logger.error(`Failed to add scheduled task "${name}":`, error);
            throw error;
        }
    }
    startTask(name) {
        const scheduledTask = this.tasks.get(name);
        if (!scheduledTask) {
            throw new Error(`Task "${name}" not found`);
        }
        scheduledTask.task.start();
        logger.info(`Started task: ${name}`);
    }
    stopTask(name) {
        const scheduledTask = this.tasks.get(name);
        if (!scheduledTask) {
            logger.warn(`Task "${name}" not found when attempting to stop`);
            return;
        }
        scheduledTask.task.stop();
        this.tasks.delete(name);
        logger.info(`Stopped and removed task: ${name}`);
    }
    startAll() {
        for (const [name, scheduledTask] of this.tasks) {
            try {
                scheduledTask.task.start();
                logger.info(`Started task: ${name}`);
            }
            catch (error) {
                logger.error(`Failed to start task "${name}":`, error);
            }
        }
    }
    stopAll() {
        for (const [name, scheduledTask] of this.tasks) {
            try {
                scheduledTask.task.stop();
                logger.info(`Stopped task: ${name}`);
            }
            catch (error) {
                logger.error(`Failed to stop task "${name}":`, error);
            }
        }
        this.tasks.clear();
        logger.info('All scheduled tasks stopped');
    }
    /**
     * Get task status
     */
    getTaskStatus(name) {
        const task = this.tasks.get(name);
        return {
            exists: !!task,
            isRunning: task ? task.isRunning : false
        };
    }
    /**
     * Get all task statuses
     */
    getAllTaskStatuses() {
        const statuses = {};
        for (const [name] of this.tasks) {
            statuses[name] = this.getTaskStatus(name);
        }
        return statuses;
    }
    getAllTasks() {
        return Array.from(this.tasks.values());
    }
}
export const scheduler = new Scheduler();
//# sourceMappingURL=scheduler.js.map