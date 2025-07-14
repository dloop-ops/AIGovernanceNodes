#!/usr/bin/env ts-node
declare class TestRunner {
    private results;
    private startTime;
    runAllTests(): Promise<void>;
    private runSingleTest;
    private printSummary;
}
export default TestRunner;
//# sourceMappingURL=run-all-tests.d.ts.map