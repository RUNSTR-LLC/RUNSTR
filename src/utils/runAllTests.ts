/**
 * Master Test Runner
 * Executes all competition system test scripts sequentially
 */

import { runCompetitionIntegrationTests } from './competitionIntegrationTests';
import { runLeaderboardTests } from './leaderboardTestScripts';
import { runMemberManagementTests } from './memberManagementTests';
import { runWorkoutQueryPerformanceTests } from './workoutQueryPerformanceTests';
import { runCompetitionSimulation } from './competitionSimulator';

export async function runAllCompetitionTests() {
  console.log('🚀 RUNSTR REWARDS - Competition System Test Suite');
  console.log('=' + '='.repeat(59));
  console.log('Running comprehensive tests for competition system validation\n');

  const results: any = {
    integration: null,
    leaderboard: null,
    memberManagement: null,
    performance: null,
    simulation: null
  };

  try {
    // Test 1: Integration Test Suite
    console.log('\n' + '='.repeat(60));
    console.log('TEST 1: COMPETITION INTEGRATION TEST SUITE');
    console.log('='.repeat(60));
    try {
      await runCompetitionIntegrationTests();
      results.integration = { success: true, message: 'Integration tests completed' };
    } catch (error) {
      results.integration = {
        success: false,
        message: `Integration tests failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
      console.error('❌ Integration test error:', error);
    }

    // Add delay between tests
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 2: Leaderboard Verification
    console.log('\n' + '='.repeat(60));
    console.log('TEST 2: LEADERBOARD VERIFICATION SCRIPTS');
    console.log('='.repeat(60));
    try {
      await runLeaderboardTests();
      results.leaderboard = { success: true, message: 'Leaderboard tests completed' };
    } catch (error) {
      results.leaderboard = {
        success: false,
        message: `Leaderboard tests failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
      console.error('❌ Leaderboard test error:', error);
    }

    // Add delay between tests
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 3: Member Management
    console.log('\n' + '='.repeat(60));
    console.log('TEST 3: MEMBER MANAGEMENT TEST SCRIPTS');
    console.log('='.repeat(60));
    try {
      await runMemberManagementTests();
      results.memberManagement = { success: true, message: 'Member management tests completed' };
    } catch (error) {
      results.memberManagement = {
        success: false,
        message: `Member management tests failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
      console.error('❌ Member management test error:', error);
    }

    // Add delay between tests
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 4: Workout Query Performance
    console.log('\n' + '='.repeat(60));
    console.log('TEST 4: WORKOUT QUERY PERFORMANCE TESTS');
    console.log('='.repeat(60));
    try {
      await runWorkoutQueryPerformanceTests();
      results.performance = { success: true, message: 'Performance tests completed' };
    } catch (error) {
      results.performance = {
        success: false,
        message: `Performance tests failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
      console.error('❌ Performance test error:', error);
    }

    // Add delay between tests
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 5: Competition Simulator
    console.log('\n' + '='.repeat(60));
    console.log('TEST 5: REAL-TIME COMPETITION SIMULATOR');
    console.log('='.repeat(60));
    try {
      // Run a quick simulation
      await runCompetitionSimulation({
        teamSize: 10,
        competitionDuration: 3,
        activityType: 'Running',
        competitionType: 'Total Distance',
        simulationSpeed: 'instant'
      });
      results.simulation = { success: true, message: 'Competition simulation completed' };
    } catch (error) {
      results.simulation = {
        success: false,
        message: `Simulation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
      console.error('❌ Simulation error:', error);
    }

  } catch (error) {
    console.error('❌ Unexpected error during test execution:', error);
  }

  // Final Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 FINAL TEST SUMMARY');
  console.log('='.repeat(60));

  let totalSuccess = 0;
  let totalFailed = 0;

  Object.entries(results).forEach(([test, result]: [string, any]) => {
    const icon = result?.success ? '✅' : '❌';
    const status = result?.success ? 'PASSED' : 'FAILED';
    console.log(`${icon} ${test.toUpperCase()}: ${status}`);
    if (result?.message) {
      console.log(`   ${result.message}`);
    }
    if (result?.success) {
      totalSuccess++;
    } else {
      totalFailed++;
    }
  });

  console.log('\n' + '-'.repeat(60));
  console.log(`Total: ${totalSuccess}/${Object.keys(results).length} test suites passed`);

  if (totalFailed === 0) {
    console.log('\n🎉 All test suites completed successfully!');
  } else {
    console.log(`\n⚠️ ${totalFailed} test suite(s) need attention.`);
  }

  console.log('=' + '='.repeat(59) + '\n');

  return results;
}

// Allow running from command line
if (require.main === module) {
  runAllCompetitionTests()
    .then(() => {
      console.log('Test runner completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('Test runner failed:', error);
      process.exit(1);
    });
}