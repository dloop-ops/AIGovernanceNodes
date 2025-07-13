
import * as cron from 'node-cron';
import logger from './logger.js';

export interface ScheduledTask {
  name: string;
  schedule: string;
  task: () => Promise<void> | void;
  enabled: boolean;
  instance?: cron.ScheduledTask;
}

export class Scheduler {
  private tasks: Map<string, ScheduledTask> = new Map();

  constructor() {
    logger.info('Scheduler initialized');
  }

  /**
   * Add a scheduled task
   */
  addTask(task: ScheduledTask): void {
    if (this.tasks.has(task.name)) {
      logger.warn(`Task ${task.name} already exists, replacing it`);
      this.stopTask(task.name);
    }

    if (task.enabled) {
      try {
        const scheduledTask = cron.schedule(task.schedule, async () => {
          try {
            logger.info(`Executing scheduled task: ${task.name}`);
            await task.task();
            logger.info(`Completed scheduled task: ${task.name}`);
          } catch (error) {
            logger.error(`Error in scheduled task ${task.name}:`, { error });
          }
        }, {
          scheduled: false,
          timezone: 'UTC'
        });

        task.instance = scheduledTask;
        this.tasks.set(task.name, task);
        
        logger.info(`Added scheduled task: ${task.name} with schedule: ${task.schedule}`);
      } catch (error) {
        logger.error(`Failed to add task ${task.name}:`, { error });
      }
    } else {
      this.tasks.set(task.name, task);
      logger.info(`Added disabled task: ${task.name}`);
    }
  }

  /**
   * Start a specific task
   */
  startTask(taskName: string): void {
    const task = this.tasks.get(taskName);
    if (task && task.instance) {
      task.instance.start();
      logger.info(`Started task: ${taskName}`);
    } else {
      logger.warn(`Task ${taskName} not found or has no instance`);
    }
  }

  /**
   * Stop a specific task
   */
  stopTask(taskName: string): void {
    const task = this.tasks.get(taskName);
    if (task && task.instance) {
      task.instance.stop();
      logger.info(`Stopped task: ${taskName}`);
    }
  }

  /**
   * Start all enabled tasks
   */
  startAll(): void {
    this.tasks.forEach((task, name) => {
      if (task.enabled && task.instance) {
        this.startTask(name);
      }
    });
    logger.info('All enabled tasks started');
  }

  /**
   * Stop all running tasks
   */
  stopAll(): void {
    this.tasks.forEach((task, name) => {
      if (task.instance) {
        this.stopTask(name);
      }
    });
    logger.info('All tasks stopped');
  }

  /**
   * Remove a task
   */
  removeTask(taskName: string): void {
    const task = this.tasks.get(taskName);
    if (task) {
      this.stopTask(taskName);
      if (task.instance) {
        task.instance.destroy();
      }
      this.tasks.delete(taskName);
      logger.info(`Removed task: ${taskName}`);
    }
  }

  /**
   * Get status of all tasks
   */
  getTaskStatus(): Array<{ name: string; schedule: string; enabled: boolean; running: boolean }> {
    const status: Array<{ name: string; schedule: string; enabled: boolean; running: boolean }> = [];
    
    this.tasks.forEach((task, name) => {
      status.push({
        name,
        schedule: task.schedule,
        enabled: task.enabled,
        running: task.instance ? true : false
      });
    });

    return status;
  }

  /**
   * Get task count
   */
  getTaskCount(): number {
    return this.tasks.size;
  }

  /**
   * Check if a task exists
   */
  hasTask(taskName: string): boolean {
    return this.tasks.has(taskName);
  }
}
