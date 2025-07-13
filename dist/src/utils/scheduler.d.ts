import * as cron from 'node-cron';
export interface ScheduledTask {
    name: string;
    schedule: string;
    task: () => Promise<void> | void;
    enabled: boolean;
    instance?: cron.ScheduledTask;
}
export declare class Scheduler {
    private tasks;
    constructor();
    /**
     * Add a scheduled task
     */
    addTask(task: ScheduledTask): void;
    /**
     * Start a specific task
     */
    startTask(taskName: string): void;
    /**
     * Stop a specific task
     */
    stopTask(taskName: string): void;
    /**
     * Start all enabled tasks
     */
    startAll(): void;
    /**
     * Stop all running tasks
     */
    stopAll(): void;
    /**
     * Remove a task
     */
    removeTask(taskName: string): void;
    /**
     * Get status of all tasks
     */
    getTaskStatus(): Array<{
        name: string;
        schedule: string;
        enabled: boolean;
        running: boolean;
    }>;
    /**
     * Get task count
     */
    getTaskCount(): number;
    /**
     * Check if a task exists
     */
    hasTask(taskName: string): boolean;
}
//# sourceMappingURL=scheduler.d.ts.map