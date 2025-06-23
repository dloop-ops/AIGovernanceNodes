#!/usr/bin/env node
import dotenv from 'dotenv';
import { WalletService } from '../services/WalletService.js';
import { ContractService } from '../services/ContractService.js';
import { DiagnosticService } from '../utils/diagnostics.js';
import { contractLogger as logger } from '../utils/logger.js';
// Load environment variables
dotenv.config();
async function runDiagnostics() {
    logger.info('🔍 Starting DLoop AI Governance Node Diagnostics...');
    try {
        // Initialize services
        const walletService = new WalletService();
        const contractService = new ContractService(walletService);
        const diagnosticService = new DiagnosticService(walletService, contractService);
        // Run full diagnostics
        logger.info('Running comprehensive diagnostics on all nodes...');
        const results = await diagnosticService.runFullDiagnostics();
        // Display results
        console.log('\n=== DIAGNOSTIC RESULTS ===\n');
        results.forEach((result, index) => {
            console.log(`Node ${index + 1} (${result.address}):`);
            console.log(`  ✅ Registered: ${result.isRegistered ? 'YES' : 'NO'}`);
            console.log(`  💰 DLOOP Balance: ${result.dloopBalance} DLOOP`);
            console.log(`  ⛽ ETH Balance: ${result.ethBalance} ETH`);
            console.log(`  🔐 Has SoulBound NFT: ${result.hasStakeApproval ? 'YES' : 'NO'}`);
            if (result.registrationErrors.length > 0) {
                console.log(`  ⚠️  Issues:`);
                result.registrationErrors.forEach(error => {
                    console.log(`    - ${error}`);
                });
            }
            console.log('');
        });
        // Attempt auto-fix for nodes with issues
        const nodesWithIssues = results.filter(r => r.registrationErrors.length > 0 || !r.isRegistered);
        if (nodesWithIssues.length > 0) {
            console.log('\n=== ATTEMPTING AUTO-FIX ===\n');
            for (const node of nodesWithIssues) {
                logger.info(`🔧 Attempting to fix issues for Node ${node.nodeIndex + 1}...`);
                try {
                    const fixResult = await diagnosticService.attemptAutoFix(node.nodeIndex);
                    console.log(`Node ${node.nodeIndex + 1} Auto-Fix Results:`);
                    console.log(`  Success: ${fixResult.success ? 'YES' : 'NO'}`);
                    if (fixResult.actions.length > 0) {
                        console.log(`  Actions Taken:`);
                        fixResult.actions.forEach(action => console.log(`    ✅ ${action}`));
                    }
                    if (fixResult.errors.length > 0) {
                        console.log(`  Errors:`);
                        fixResult.errors.forEach(error => console.log(`    ❌ ${error}`));
                    }
                    console.log('');
                }
                catch (error) {
                    logger.error(`Failed to auto-fix Node ${node.nodeIndex + 1}:`, error);
                }
            }
        }
        else {
            console.log('\n✅ All nodes are functioning correctly! No fixes needed.\n');
        }
        // Run final diagnostics to verify fixes
        if (nodesWithIssues.length > 0) {
            console.log('\n=== POST-FIX VERIFICATION ===\n');
            logger.info('Running post-fix verification...');
            const postFixResults = await diagnosticService.runFullDiagnostics();
            const stillBroken = postFixResults.filter(r => r.registrationErrors.length > 0 || !r.isRegistered);
            if (stillBroken.length === 0) {
                console.log('🎉 All nodes are now working correctly!\n');
            }
            else {
                console.log(`⚠️  ${stillBroken.length} nodes still have issues that require manual intervention:\n`);
                stillBroken.forEach(node => {
                    console.log(`Node ${node.nodeIndex + 1}: ${node.registrationErrors.join(', ')}`);
                });
            }
        }
    }
    catch (error) {
        logger.error('Diagnostic script failed:', error);
        console.error('❌ Diagnostic script failed:', error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
}
async function startMonitoring() {
    logger.info('🔄 Starting continuous monitoring...');
    try {
        const walletService = new WalletService();
        const contractService = new ContractService(walletService);
        const diagnosticService = new DiagnosticService(walletService, contractService);
        // Start continuous monitoring every 5 minutes
        await diagnosticService.startContinuousMonitoring(5 * 60 * 1000);
        console.log('🔄 Continuous monitoring started. Press Ctrl+C to stop.');
        // Keep the process running
        process.stdin.resume();
    }
    catch (error) {
        logger.error('Monitoring startup failed:', error);
        console.error('❌ Monitoring startup failed:', error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
}
// Main execution
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
// Handle graceful shutdown
process.on('SIGINT', () => {
    logger.info('Received SIGINT, shutting down gracefully...');
    process.exit(0);
});
process.on('SIGTERM', () => {
    logger.info('Received SIGTERM, shutting down gracefully...');
    process.exit(0);
});
// Run the main function
if (require.main === module) {
    main().catch(error => {
        logger.error('Main execution failed:', error);
        console.error('❌ Execution failed:', error instanceof Error ? error.message : String(error));
        process.exit(1);
    });
}
//# sourceMappingURL=diagnostics.js.map