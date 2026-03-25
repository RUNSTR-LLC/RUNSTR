/**
 * Run All Core Tests
 * Run: npx tsx scripts/core-tests/run-all.ts
 *
 * Executes all core test scripts in sequence and reports a summary.
 * Each test runs as a child process so failures in one do not block others.
 */

import { execSync } from 'child_process';
import * as path from 'path';

interface TestResult {
  name: string;
  file: string;
  passed: boolean;
  duration: number;
  output: string;
}

const TESTS = [
  { name: 'Auth Flow', file: 'test-auth-flow.ts' },
  { name: 'Reward Destination', file: 'test-reward-destination.ts' },
  { name: 'Workout Submission', file: 'test-workout-submission.ts' },
  { name: 'Charity Addresses', file: 'test-charity-addresses.ts' },
  { name: 'Navigation Flows', file: 'test-navigation-flows.ts' },
  { name: 'Background Sync', file: 'test-background-sync.ts' },
  { name: 'Competition Enrollment', file: 'test-competition-enrollment.ts' },
  { name: 'Club Operations', file: 'test-club-operations.ts' },
  { name: 'Encrypted Backup', file: 'test-encrypted-backup.ts' },
  { name: 'Reward Eligibility', file: 'test-reward-eligibility.ts' },
  { name: 'Destination Delivery', file: 'test-destination-delivery.ts' },
  { name: 'Screen Navigation', file: 'test-screen-navigation.ts' },
];

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('  RUNSTR Core Test Suite');
  console.log('='.repeat(60));
  console.log(`\nRunning ${TESTS.length} test suites...\n`);

  const results: TestResult[] = [];

  for (const test of TESTS) {
    const filePath = path.join(__dirname, test.file);
    console.log(`--- ${test.name} (${test.file}) ---\n`);

    const start = Date.now();
    let output = '';
    let passed = false;

    try {
      output = execSync(`npx tsx "${filePath}"`, {
        cwd: path.join(__dirname, '../..'),
        encoding: 'utf8',
        timeout: 60000, // 60s timeout per test
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      passed = true;
    } catch (err: any) {
      // execSync throws on non-zero exit code
      output = (err.stdout || '') + (err.stderr || '');
      passed = false;
    }

    const duration = Date.now() - start;

    // Print the output
    console.log(output);

    results.push({
      name: test.name,
      file: test.file,
      passed,
      duration,
      output,
    });
  }

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------

  console.log('\n' + '='.repeat(60));
  console.log('  SUMMARY');
  console.log('='.repeat(60) + '\n');

  let totalPassed = 0;
  let totalFailed = 0;

  for (const result of results) {
    const status = result.passed ? 'PASS' : 'FAIL';
    const time = `${(result.duration / 1000).toFixed(1)}s`;
    console.log(`  ${status}  ${result.name.padEnd(25)} ${time}`);

    if (result.passed) {
      totalPassed++;
    } else {
      totalFailed++;
    }
  }

  console.log(`\n  ${totalPassed} suites passed, ${totalFailed} suites failed out of ${results.length} total`);
  console.log('');

  process.exit(totalFailed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
