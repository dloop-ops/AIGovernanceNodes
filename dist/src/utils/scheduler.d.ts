export interface ScheduledTask {
    name: string;
    schedule: string;
    task: () => Promise<void>;
    enabled: boolean;
}
export declare class Scheduler {
    private tasks;
    constructor();
    /**
     * Add a scheduled task
     */
    addTask(taskConfig: ScheduledTask): void;
    /**
     * Start a specific task
     */
    startTask(taskName: string): void;
    /**
     * Stop a specific task
     */
    stopTask(taskName: string): void;
    /**
     * Remove a task
     */
    removeTask(taskName: string): void;
    /**
     * Start all tasks
     */
    startAll(): void;
    /**
     * Stop all tasks
     */
    stopAll(): void;
    /**
     * Get task status
     */
    getTaskStatus(): Array<{
        name: string;
        running: boolean;
    }>;
    /**
     * Validate cron expression
     */
    static validateCronExpression(expression: string): boolean;
    /**
     * Get next execution time for a cron expression
     */
    static getNextExecution(expression: string): Date | null;
}
export declare const scheduler: Scheduler;
export default scheduler;
//# sourceMappingURL=scheduler.d.ts.map