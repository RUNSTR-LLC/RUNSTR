/**
 * Test Integration Helper
 * Import this file in your React Native app to run competition tests
 *
 * Usage in your app:
 * import { runQuickTest, runFullTestSuite } from './utils/testIntegration';
 *
 * // In a component or screen:
 * const handleRunTests = async () => {
 *   const results = await runQuickTest();
 *   console.log('Test results:', results);
 * };
 */

import { CompetitionIntegrationTestSuite } from './competitionIntegrationTests';
import { LeaderboardTestScripts } from './leaderboardTestScripts';
import { MemberManagementTestScripts } from './memberManagementTests';
import { WorkoutQueryPerformanceTests } from './workoutQueryPerformanceTests';
import { CompetitionSimulator } from './competitionSimulator';

export interface TestSuiteResult {
  suiteName: string;
  passed: number;
  failed: number;
  total: number;
  duration: number;
  success: boolean;
  error?: string;
}

/**
 * Run a quick validation test
 * This runs minimal tests to verify the system is working
 */
export async function runQuickTest(): Promise<TestSuiteResult[]> {
  console.log('🚀 Running Quick Competition Test');
  const results: TestSuiteResult[] = [];

  try {
    // Quick leaderboard test
    console.log('\n📊 Quick Leaderboard Test...');
    const leaderboardTester = new LeaderboardTestScripts();
    const startTime = Date.now();

    // Just test one scenario
    const mockMetrics = new Map([
      ['user1', {
        npub: 'user1',
        totalDistance: 100,
        totalDuration: 300,
        totalCalories: 1500,
        workoutCount: 10,
        activeDays: 7,
        longestDistance: 20,
        longestDuration: 60,
        streakDays: 5,
        workouts: []
      }],
      ['user2', {
        npub: 'user2',
        totalDistance: 50,
        totalDuration: 200,
        totalCalories: 800,
        workoutCount: 5,
        activeDays: 4,
        longestDistance: 15,
        longestDuration: 45,
        streakDays: 2,
        workouts: []
      }]
    ]);

    // Test basic ranking
    const rankings = Array.from(mockMetrics.values())
      .sort((a, b) => b.totalDistance - a.totalDistance);

    const success = rankings[0].npub === 'user1';

    results.push({
      suiteName: 'Leaderboard Quick Test',
      passed: success ? 1 : 0,
      failed: success ? 0 : 1,
      total: 1,
      duration: Date.now() - startTime,
      success
    });

    console.log(success ? '✅ Leaderboard test passed' : '❌ Leaderboard test failed');

  } catch (error) {
    results.push({
      suiteName: 'Quick Test',
      passed: 0,
      failed: 1,
      total: 1,
      duration: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  return results;
}

/**
 * Run the full test suite
 * This runs all comprehensive tests
 */
export async function runFullTestSuite(): Promise<TestSuiteResult[]> {
  console.log('🚀 Running Full Competition Test Suite');
  const results: TestSuiteResult[] = [];

  // Test 1: Integration Tests
  try {
    console.log('\n📦 Running Integration Tests...');
    const integrationSuite = new CompetitionIntegrationTestSuite();
    const startTime = Date.now();
    const testResults = await integrationSuite.runFullSuite();

    const passed = testResults.filter(r => r.success).length;
    const failed = testResults.filter(r => !r.success).length;

    results.push({
      suiteName: 'Integration Tests',
      passed,
      failed,
      total: testResults.length,
      duration: Date.now() - startTime,
      success: failed === 0
    });
  } catch (error) {
    results.push({
      suiteName: 'Integration Tests',
      passed: 0,
      failed: 1,
      total: 1,
      duration: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // Test 2: Leaderboard Tests
  try {
    console.log('\n📊 Running Leaderboard Tests...');
    const leaderboardSuite = new LeaderboardTestScripts();
    const startTime = Date.now();
    const testResults = await leaderboardSuite.runAllTests();

    const passed = testResults.filter(r => r.success).length;
    const failed = testResults.filter(r => !r.success).length;

    results.push({
      suiteName: 'Leaderboard Tests',
      passed,
      failed,
      total: testResults.length,
      duration: Date.now() - startTime,
      success: failed === 0
    });
  } catch (error) {
    results.push({
      suiteName: 'Leaderboard Tests',
      passed: 0,
      failed: 1,
      total: 1,
      duration: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // Test 3: Member Management Tests
  try {
    console.log('\n👥 Running Member Management Tests...');
    const memberSuite = new MemberManagementTestScripts();
    const startTime = Date.now();
    const testResults = await memberSuite.runAllTests();

    const passed = testResults.filter(r => r.success).length;
    const failed = testResults.filter(r => !r.success).length;

    results.push({
      suiteName: 'Member Management Tests',
      passed,
      failed,
      total: testResults.length,
      duration: Date.now() - startTime,
      success: failed === 0
    });
  } catch (error) {
    results.push({
      suiteName: 'Member Management Tests',
      passed: 0,
      failed: 1,
      total: 1,
      duration: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // Test 4: Performance Tests
  try {
    console.log('\n⚡ Running Performance Tests...');
    const performanceSuite = new WorkoutQueryPerformanceTests();
    const startTime = Date.now();
    const testResults = await performanceSuite.runAllTests();

    const passed = testResults.filter(r => r.success).length;
    const failed = testResults.filter(r => !r.success).length;

    results.push({
      suiteName: 'Performance Tests',
      passed,
      failed,
      total: testResults.length,
      duration: Date.now() - startTime,
      success: failed === 0
    });
  } catch (error) {
    results.push({
      suiteName: 'Performance Tests',
      passed: 0,
      failed: 1,
      total: 1,
      duration: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // Test 5: Quick Simulation
  try {
    console.log('\n🏃 Running Competition Simulation...');
    const simulator = new CompetitionSimulator();
    const startTime = Date.now();

    await simulator.runSimulation({
      teamSize: 5,
      competitionDuration: 1,
      activityType: 'Running',
      competitionType: 'Total Distance',
      simulationSpeed: 'instant',
      enableNotifications: false,
      enableZaps: false
    });

    results.push({
      suiteName: 'Competition Simulation',
      passed: 1,
      failed: 0,
      total: 1,
      duration: Date.now() - startTime,
      success: true
    });
  } catch (error) {
    results.push({
      suiteName: 'Competition Simulation',
      passed: 0,
      failed: 1,
      total: 1,
      duration: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUITE SUMMARY');
  console.log('='.repeat(60));

  let totalPassed = 0;
  let totalFailed = 0;
  let totalTests = 0;

  results.forEach(suite => {
    const icon = suite.success ? '✅' : '❌';
    console.log(`\n${icon} ${suite.suiteName}:`);
    console.log(`   Passed: ${suite.passed}/${suite.total}`);
    console.log(`   Duration: ${(suite.duration / 1000).toFixed(2)}s`);
    if (suite.error) {
      console.log(`   Error: ${suite.error}`);
    }

    totalPassed += suite.passed;
    totalFailed += suite.failed;
    totalTests += suite.total;
  });

  console.log('\n' + '-'.repeat(60));
  console.log(`Overall: ${totalPassed}/${totalTests} tests passed`);
  console.log(`Success Rate: ${((totalPassed / totalTests) * 100).toFixed(1)}%`);

  if (totalFailed === 0) {
    console.log('\n🎉 All tests passed successfully!');
  } else {
    console.log(`\n⚠️ ${totalFailed} test(s) failed. Review the logs above.`);
  }

  return results;
}

/**
 * Run a specific test suite
 */
export async function runTestSuite(suiteName: 'integration' | 'leaderboard' | 'member' | 'performance' | 'simulation'): Promise<TestSuiteResult> {
  console.log(`🧪 Running ${suiteName} test suite...`);

  const startTime = Date.now();

  try {
    let passed = 0;
    let failed = 0;
    let total = 0;

    switch (suiteName) {
      case 'integration': {
        const suite = new CompetitionIntegrationTestSuite();
        const results = await suite.runFullSuite();
        passed = results.filter(r => r.success).length;
        failed = results.filter(r => !r.success).length;
        total = results.length;
        break;
      }
      case 'leaderboard': {
        const suite = new LeaderboardTestScripts();
        const results = await suite.runAllTests();
        passed = results.filter(r => r.success).length;
        failed = results.filter(r => !r.success).length;
        total = results.length;
        break;
      }
      case 'member': {
        const suite = new MemberManagementTestScripts();
        const results = await suite.runAllTests();
        passed = results.filter(r => r.success).length;
        failed = results.filter(r => !r.success).length;
        total = results.length;
        break;
      }
      case 'performance': {
        const suite = new WorkoutQueryPerformanceTests();
        const results = await suite.runAllTests();
        passed = results.filter(r => r.success).length;
        failed = results.filter(r => !r.success).length;
        total = results.length;
        break;
      }
      case 'simulation': {
        const simulator = new CompetitionSimulator();
        await simulator.runSimulation({
          teamSize: 10,
          competitionDuration: 3,
          activityType: 'Running',
          competitionType: 'Total Distance',
          simulationSpeed: 'instant',
          enableNotifications: true,
          enableZaps: true
        });
        passed = 1;
        failed = 0;
        total = 1;
        break;
      }
    }

    return {
      suiteName,
      passed,
      failed,
      total,
      duration: Date.now() - startTime,
      success: failed === 0
    };

  } catch (error) {
    return {
      suiteName,
      passed: 0,
      failed: 1,
      total: 1,
      duration: Date.now() - startTime,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Export test suite classes for direct use
export {
  CompetitionIntegrationTestSuite,
  LeaderboardTestScripts,
  MemberManagementTestScripts,
  WorkoutQueryPerformanceTests,
  CompetitionSimulator
};