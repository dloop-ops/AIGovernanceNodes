import * as cron from 'node-cron';
import logger from './logger.js';

export interface ScheduledTask {
  name: string;
  schedule: string;
  task: () => Promise<void>;
  enabled: boolean;
}

export class Scheduler {
  private tasks: Map<string, cron.ScheduledTask> = new Map();

  constructor() {
    logger.info('Scheduler initialized');
  }

  /**
   * Add a scheduled task
   */
  addTask(taskConfig: ScheduledTask): void {
    if (this.tasks.has(taskConfig.name)) {
      logger.warn(`Task ${taskConfig.name} already exists, updating...`);
      this.removeTask(taskConfig.name);
    }

    const scheduledTask = cron.schedule(
      taskConfig.schedule,
      async () => {
        if (!taskConfig.enabled) {
          logger.debug(`Task ${taskConfig.name} is disabled, skipping...`);
          return;
        }

        logger.info(`Executing scheduled task: ${taskConfig.name}`);
        const startTime = Date.now();

        try {
          await taskConfig.task();
          const duration = Date.now() - startTime;
          logger.info(`Task ${taskConfig.name} completed successfully in ${duration}ms`);
        } catch (error) {
          const duration = Date.now() - startTime;
          logger.error(`Task ${taskConfig.name} failed after ${duration}ms`, {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
          });
        }
      },
      {
        timezone: 'UTC'
      }
    );

    this.tasks.set(taskConfig.name, scheduledTask);
    logger.info(`Scheduled task added: ${taskConfig.name} with schedule: ${taskConfig.schedule}`);
  }

  /**
   * Start a specific task
   */
  startTask(taskName: string): void {
    const task = this.tasks.get(taskName);
    if (task) {
      task.start();
      logger.info(`Started task: ${taskName}`);
    } else {
      logger.error(`Task not found: ${taskName}`);
    }
  }

  /**
   * Stop a specific task
   */
  stopTask(taskName: string): void {
    const task = this.tasks.get(taskName);
    if (task) {
      task.stop();
      logger.info(`Stopped task: ${taskName}`);
    } else {
      logger.error(`Task not found: ${taskName}`);
    }
  }

  /**
   * Remove a task
   */
  removeTask(taskName: string): void {
    const task = this.tasks.get(taskName);
    if (task) {
      task.destroy();
      this.tasks.delete(taskName);
      logger.info(`Removed task: ${taskName}`);
    }
  }

  /**
   * Start all tasks
   */
  startAll(): void {
    logger.info('Starting all scheduled tasks...');
    for (const [name, task] of this.tasks) {
      task.start();
      logger.info(`Started task: ${name}`);
    }
  }

  /**
   * Stop all tasks
   */
  stopAll(): void {
    logger.info('Stopping all scheduled tasks...');
    for (const [name, task] of this.tasks) {
      task.stop();
      logger.info(`Stopped task: ${name}`);
    }
  }

  /**
   * Get task status
   */
  getTaskStatus(): Array<{ name: string; running: boolean }> {
    return Array.from(this.tasks.entries()).map(([name, task]) => ({
      name,
      running: task.getStatus() === 'scheduled'
    }));
  }

  /**
   * Validate cron expression
   */
  static validateCronExpression(expression: string): boolean {
    return cron.validate(expression);
  }

  /**
   * Get next execution time for a cron expression
   */
  static getNextExecution(expression: string): Date | null {
    try {
      const task = cron.schedule(expression, () => {}, { timezone: 'UTC' });
      // This is a workaround since node-cron doesn't expose next execution directly
      // In a real implementation, you might want to use a library like 'cron-parser'
      task.destroy();
      return new Date(); // Placeholder - would need cron-parser for actual implementation
    } catch {
      return null;
    }
  }
}

export const scheduler = new Scheduler();
export default scheduler;
