"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduler = exports.Scheduler = void 0;
const cron = __importStar(require("node-cron"));
const logger_js_1 = __importDefault(require("./logger.js"));
class Scheduler {
    constructor() {
        this.tasks = new Map();
        logger_js_1.default.info('Scheduler initialized');
    }
    addTask(name, schedule, taskFunction) {
        try {
            if (this.tasks.has(name)) {
                this.stopTask(name);
            }
            const task = cron.schedule(schedule, async () => {
                const scheduledTask = this.tasks.get(name);
                if (!scheduledTask)
                    return;
                if (scheduledTask.isRunning) {
                    logger_js_1.default.warn(`Task "${name}" is already running, skipping this execution`);
                    return;
                }
                try {
                    scheduledTask.isRunning = true;
                    logger_js_1.default.info(`Starting scheduled task: ${name}`);
                    await taskFunction();
                    logger_js_1.default.info(`Completed scheduled task: ${name}`);
                }
                catch (error) {
                    logger_js_1.default.error(`Error in scheduled task "${name}":`, error);
                }
                finally {
                    scheduledTask.isRunning = false;
                }
            }, {
                timezone: 'UTC'
            });
            this.tasks.set(name, {
                name,
                schedule,
                task,
                isRunning: false
            });
            logger_js_1.default.info(`Added scheduled task "${name}" with schedule: ${schedule}`);
        }
        catch (error) {
            logger_js_1.default.error(`Failed to add scheduled task "${name}":`, error);
            throw error;
        }
    }
    startTask(name) {
        const scheduledTask = this.tasks.get(name);
        if (!scheduledTask) {
            throw new Error(`Task "${name}" not found`);
        }
        scheduledTask.task.start();
        logger_js_1.default.info(`Started task: ${name}`);
    }
    stopTask(name) {
        const scheduledTask = this.tasks.get(name);
        if (!scheduledTask) {
            logger_js_1.default.warn(`Task "${name}" not found when attempting to stop`);
            return;
        }
        scheduledTask.task.stop();
        this.tasks.delete(name);
        logger_js_1.default.info(`Stopped and removed task: ${name}`);
    }
    startAll() {
        for (const [name, scheduledTask] of this.tasks) {
            try {
                scheduledTask.task.start();
                logger_js_1.default.info(`Started task: ${name}`);
            }
            catch (error) {
                logger_js_1.default.error(`Failed to start task "${name}":`, error);
            }
        }
    }
    stopAll() {
        for (const [name, scheduledTask] of this.tasks) {
            try {
                scheduledTask.task.stop();
                logger_js_1.default.info(`Stopped task: ${name}`);
            }
            catch (error) {
                logger_js_1.default.error(`Failed to stop task "${name}":`, error);
            }
        }
        this.tasks.clear();
        logger_js_1.default.info('All scheduled tasks stopped');
    }
    getTaskStatus(name) {
        const task = this.tasks.get(name);
        return {
            exists: !!task,
            isRunning: task ? task.isRunning : false
        };
    }
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
exports.Scheduler = Scheduler;
exports.scheduler = new Scheduler();
//# sourceMappingURL=scheduler.js.map