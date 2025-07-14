#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const WalletService_js_1 = require("../services/WalletService.js");
const ContractService_js_1 = require("../services/ContractService.js");
const diagnostics_js_1 = require("../utils/diagnostics.js");
const logger_js_1 = require("../utils/logger.js");
dotenv_1.default.config();
async function runDiagnostics() {
    logger_js_1.contractLogger.info('🔍 Starting DLoop AI Governance Node Diagnostics...');
    try {
        const walletService = new WalletService_js_1.WalletService();
        const contractService = new ContractService_js_1.ContractService(walletService);
        const diagnosticService = new diagnostics_js_1.DiagnosticService(walletService, contractService);
        logger_js_1.contractLogger.info('Running comprehensive diagnostics on all nodes...');
        const results = await diagnosticService.runFullDiagnostics();
        console.log('\n=== DIAGNOSTIC RESULTS ===\n');
        results.forEach((result, index) => {
            console.log(`Node ${index + 1} (${result.address}):`);
            console.log(`  ✅ Registered: ${result.isRegistered ? 'YES' : 'NO'}`);
            console.log(`  💰 DLOOP Balance: ${result.dloopBalance} DLOOP`);
            console.log(`  ⛽ ETH Balance: ${result.ethBalance} ETH`);
            console.log(`  🔐 Has SoulBound NFT: ${result.hasStakeApproval ? 'YES' : 'NO'}`);
            if (result.registrationErrors.length > 0) {
                console.log(`  ⚠️  Issues:`);
                result.registrationErrors.forEach((error) => {
                    console.log(`    - ${error}`);
                });
            }
            console.log('');
        });
        const nodesWithIssues = results.filter((r) => r.registrationErrors.length > 0 || !r.isRegistered);
        if (nodesWithIssues.length > 0) {
            console.log('\n=== ATTEMPTING AUTO-FIX ===\n');
            for (const node of nodesWithIssues) {
                logger_js_1.contractLogger.info(`🔧 Attempting to fix issues for Node ${node.nodeIndex + 1}...`);
                try {
                    const fixResult = await diagnosticService.attemptAutoFix(node.nodeIndex);
                    console.log(`Node ${node.nodeIndex + 1} Auto-Fix Results:`);
                    console.log(`  Success: ${fixResult.success ? 'YES' : 'NO'}`);
                    if (fixResult.actions.length > 0) {
                        console.log(`  Actions Taken:`);
                        fixResult.actions.forEach((action) => console.log(`    ✅ ${action}`));
                    }
                    if (fixResult.errors.length > 0) {
                        console.log(`  Errors:`);
                        fixResult.errors.forEach((error) => console.log(`    ❌ ${error}`));
                    }
                    console.log('');
                }
                catch (error) {
                    logger_js_1.contractLogger.error(`Failed to auto-fix Node ${node.nodeIndex + 1}:`, error);
                }
            }
        }
        else {
            console.log('\n✅ All nodes are functioning correctly! No fixes needed.\n');
        }
        if (nodesWithIssues.length > 0) {
            console.log('\n=== POST-FIX VERIFICATION ===\n');
            logger_js_1.contractLogger.info('Running post-fix verification...');
            const postFixResults = await diagnosticService.runFullDiagnostics();
            const stillBroken = postFixResults.filter((r) => r.registrationErrors.length > 0 || !r.isRegistered);
            if (stillBroken.length === 0) {
                console.log('🎉 All nodes are now working correctly!\n');
            }
            else {
                console.log(`⚠️  ${stillBroken.length} nodes still have issues that require manual intervention:\n`);
                stillBroken.forEach((node) => {
                    console.log(`Node ${node.nodeIndex + 1}: ${node.registrationErrors.join(', ')}`);
                });
            }
        }
    }
    catch (error) {
        logger_js_1.contractLogger.error('Diagnostic script failed:', error);
        console.error('❌ Diagnostic script failed:', error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
}
async function startMonitoring() {
    logger_js_1.contractLogger.info('🔄 Starting continuous monitoring...');
    try {
        const walletService = new WalletService_js_1.WalletService();
        const contractService = new ContractService_js_1.ContractService(walletService);
        const diagnosticService = new diagnostics_js_1.DiagnosticService(walletService, contractService);
        await diagnosticService.startContinuousMonitoring(5 * 60 * 1000);
        console.log('🔄 Continuous monitoring started. Press Ctrl+C to stop.');
        process.stdin.resume();
    }
    catch (error) {
        logger_js_1.contractLogger.error('Monitoring startup failed:', error);
        console.error('❌ Monitoring startup failed:', error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
}
async function main() {
    const command = process.argv[2] || 'diagnose';
    switch (command) {
        case 'diagnose':
            await runDiagnostics();
            break;
        case 'monitor':
            await startMonitoring();
            break;
        case 'help':
            console.log(`
DLoop AI Governance Node Diagnostics Tool

Usage: npm run diagnose [command]

Commands:
  diagnose    Run comprehensive diagnostics and attempt auto-fix (default)
  monitor     Start continuous monitoring
  help        Show this help message

Examples:
  npm run diagnose
  npm run diagnose monitor
      `);
            break;
        default:
            console.error(`Unknown command: ${command}`);
            console.log('Run "npm run diagnose help" for usage information.');
            process.exit(1);
    }
}
process.on('SIGINT', () => {
    logger_js_1.contractLogger.info('Received SIGINT, shutting down gracefully...');
    process.exit(0);
});
process.on('SIGTERM', () => {
    logger_js_1.contractLogger.info('Received SIGTERM, shutting down gracefully...');
    process.exit(0);
});
if (require.main === module) {
    main().catch((error) => {
        logger_js_1.contractLogger.error('Main execution failed:', error);
        console.error('❌ Execution failed:', error instanceof Error ? error.message : String(error));
        process.exit(1);
    });
}
//# sourceMappingURL=diagnostics.js.map