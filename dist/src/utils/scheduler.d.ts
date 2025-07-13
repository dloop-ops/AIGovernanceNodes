import * as cron from 'node-cron';
export interface ScheduledTask {
    name: string;
    schedule: string;
    task: cron.ScheduledTask;
    isRunning: boolean;
}
export declare class Scheduler {
    private tasks;
    constructor();
    addTask(name: string, schedule: string, taskFunction: () => Promise<void> | void): void;
    startTask(name: string): void;
    stopTask(name: string): void;
    startAll(): void;
    stopAll(): void;
    /**
     * Get task status
     */
    getTaskStatus(name: string): {
        exists: boolean;
        isRunning: boolean;
    };
    /**
     * Get all task statuses
     */
    getAllTaskStatuses(): Record<string, {
        exists: boolean;
        isRunning: boolean;
    }>;
    getAllTasks(): ScheduledTask[];
}
export declare const scheduler: Scheduler;
//# sourceMappingURL=scheduler.d.ts.map