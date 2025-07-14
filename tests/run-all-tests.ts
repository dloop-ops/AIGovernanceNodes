#!/usr/bin/env ts-node

/**
 * Test Runner Script
 * 
 * This script runs all unit tests and provides a comprehensive test report
 * for the DLoop AI Governance Node software.
 */

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';

interface TestResult {
  testFile: string;
  passed: boolean;
  duration: number;
  output: string;
}

class TestRunner {
  private results: TestResult[] = [];
  private startTime: number = 0;

  async runAllTests(): Promise<void> {
    console.log('🧪 DLoop AI Governance Node - Test Suite');
    console.log('=========================================\n');

    this.startTime = Date.now();

    // Define test files to run
    const testFiles = [
      'tests/unit/WalletService.test.ts',
      'tests/unit/ContractService.test.ts',
      'tests/unit/GovernanceNode.test.ts',
      'tests/unit/ProposalService.test.ts'
    ];

    // Verify test files exist
    const existingTestFiles = testFiles.filter(file => existsSync(file));
    const missingTestFiles = testFiles.filter(file => !existsSync(file));

    if (missingTestFiles.length > 0) {
      console.log('⚠️  Missing test files:');
      missingTestFiles.forEach(file => console.log(`   - ${file}`));
      console.log('');
    }

    console.log(`📋 Running ${existingTestFiles.length} test suites...\n`);

    // Run each test file
    for (const testFile of existingTestFiles) {
      await this.runSingleTest(testFile);
    }

    this.printSummary();
  }

  private async runSingleTest(testFile: string): Promise<void> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      console.log(`🔄 Running: ${testFile}`);

      const jest = spawn('npx', ['jest', testFile, '--verbose', '--no-cache'], {
        stdio: 'pipe',
        shell: true,
        env: { ...process.env, NODE_OPTIONS: '--experimental-vm-modules' }
      });

      let output = '';

      jest.stdout.on('data', (data) => {
        output += data.toString();
      });

      jest.stderr.on('data', (data) => {
        output += data.toString();
      });

      jest.on('close', (code) => {
        const duration = Date.now() - startTime;
        const passed = code === 0;

        this.results.push({
          testFile,
          passed,
          duration,
          output
        });

        const status = passed ? '✅ PASSED' : '❌ FAILED';
        const timeStr = `(${duration}ms)`;
        
        console.log(`   ${status} ${timeStr}\n`);

        if (!passed) {
          console.log('   Error output:');
          console.log('   ' + output.split('\n').slice(-10).join('\n   '));
          console.log('');
        }

        resolve();
      });
    });
  }

  private printSummary(): void {
    const totalDuration = Date.now() - this.startTime;
    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = this.results.filter(r => !r.passed).length;
    const totalTests = this.results.length;

    console.log('📊 TEST SUMMARY');
    console.log('===============');
    console.log(`Total Tests:    ${totalTests}`);
    console.log(`Passed:         ${passedTests} ✅`);
    console.log(`Failed:         ${failedTests} ${failedTests > 0 ? '❌' : ''}`);
    console.log(`Success Rate:   ${totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0}%`);
    console.log(`Total Time:     ${totalDuration}ms`);
    console.log('');

    if (failedTests > 0) {
      console.log('❌ FAILED TESTS:');
      this.results
        .filter(r => !r.passed)
        .forEach(result => {
          console.log(`   - ${result.testFile}`);
        });
      console.log('');
      
      console.log('💡 To debug failing tests, run:');
      console.log('   npm test -- --verbose');
      console.log('');
    }

    if (passedTests === totalTests && totalTests > 0) {
      console.log('🎉 ALL TESTS PASSED! The governance system is ready for deployment.');
    } else if (failedTests > 0) {
      console.log('⚠️  Some tests failed. Please fix issues before deployment.');
      process.exit(1);
    } else {
      console.log('⚠️  No tests were run. Please ensure test files exist.');
      process.exit(1);
    }
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  const runner = new TestRunner();
  runner.runAllTests().catch((error) => {
    console.error('❌ Test runner failed:', error.message);
    process.exit(1);
  });
}

export default TestRunner;
