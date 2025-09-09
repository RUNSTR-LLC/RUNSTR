/**
 * Workout Query Performance Testing Script
 * Tests different Nostr query strategies to find the fastest approach for loading 1301 workout events
 * Run with: node test-workout-query-performance.js
 */

import { nostrRelayManager } from './src/services/nostr/NostrRelayManager.ts';
import { NostrWorkoutService } from './src/services/fitness/nostrWorkoutService.ts';

// Test configuration
const TEST_CONFIG = {
  // Replace with a real npub that has workout events
  TEST_PUBKEY: 'npub1234...', // TODO: Add real pubkey for testing
  
  // Different timeout strategies to test
  TIMEOUTS: [3000, 5000, 8000], // 3s, 5s, 8s
  
  // Test limits
  LIMITS: [50, 100, 200],
  
  // Time ranges for recent-first strategy  
  RECENT_DAYS: [7, 30, 90], // Last 7, 30, 90 days
};

class WorkoutQueryPerformanceTester {
  constructor() {
    this.results = [];
    this.workoutService = NostrWorkoutService.getInstance();
  }

  /**
   * Test a specific query strategy and measure performance
   */
  async testQueryStrategy(strategyName, queryFunction, timeout = 5000) {
    console.log(`\n🧪 Testing: ${strategyName}`);
    console.log(`Timeout: ${timeout}ms`);
    
    const startTime = Date.now();
    let success = false;
    let eventCount = 0;
    let errorMessage = null;
    
    try {
      // Create timeout promise
      const timeoutPromise = new Promise((resolve) => 
        setTimeout(() => resolve({ events: [], timedOut: true }), timeout)
      );
      
      // Race the query against timeout
      const result = await Promise.race([
        queryFunction(),
        timeoutPromise
      ]);
      
      const duration = Date.now() - startTime;
      
      if (result.timedOut) {
        console.log(`⏱️ ${strategyName}: Timed out after ${timeout}ms`);
        eventCount = 0;
        success = false;
        errorMessage = 'Timeout';
      } else {
        eventCount = Array.isArray(result.events) ? result.events.length : result.events?.size || 0;
        success = true;
        console.log(`✅ ${strategyName}: ${eventCount} events in ${duration}ms`);
      }
      
      return {
        strategyName,
        eventCount,
        duration,
        success,
        errorMessage,
        timeout
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(`❌ ${strategyName}: Failed after ${duration}ms - ${error.message}`);
      return {
        strategyName,
        eventCount: 0,
        duration,
        success: false,
        errorMessage: error.message,
        timeout
      };
    }
  }

  /**
   * Strategy 1: Current approach - Author + Kind filter
   */
  async queryAuthorAndKind(pubkey, limit = 100, timeout = 5000) {
    return new Promise(async (resolve) => {
      try {
        const result = await this.workoutService.fetchUserWorkouts(pubkey, {
          limit,
          userId: 'test-user',
          preserveRawEvents: false
        });
        
        resolve({
          events: result.parsedWorkouts || [],
          totalEvents: result.totalEvents || 0,
          relayResults: result.relayResults || []
        });
      } catch (error) {
        resolve({ events: [], error: error.message });
      }
    });
  }

  /**
   * Strategy 2: Recent workouts first (last N days)
   */
  async queryRecentFirst(pubkey, days = 30, limit = 100) {
    return new Promise(async (resolve) => {
      try {
        const since = new Date();
        since.setDate(since.getDate() - days);
        
        const result = await this.workoutService.fetchUserWorkouts(pubkey, {
          since,
          limit,
          userId: 'test-user',
          preserveRawEvents: false
        });
        
        resolve({
          events: result.parsedWorkouts || [],
          totalEvents: result.totalEvents || 0
        });
      } catch (error) {
        resolve({ events: [], error: error.message });
      }
    });
  }

  /**
   * Strategy 3: Relay manager direct query
   */
  async queryRelayManagerDirect(pubkey, limit = 100) {
    return new Promise(async (resolve) => {
      try {
        // Initialize relay manager if needed
        await nostrRelayManager.initialize?.();
        
        const events = await nostrRelayManager.queryWorkoutEvents(pubkey, {
          limit,
          since: undefined,
          until: undefined
        });
        
        resolve({
          events: events || [],
          source: 'relay-manager-direct'
        });
      } catch (error) {
        resolve({ events: [], error: error.message });
      }
    });
  }

  /**
   * Strategy 4: Cached query (if available)
   */
  async queryCachedFirst(pubkey, limit = 100) {
    return new Promise(async (resolve) => {
      try {
        // Try to get cached workouts first
        const cached = await this.workoutService.getStoredWorkouts('test-user');
        
        if (cached.length > 0) {
          console.log(`📁 Found ${cached.length} cached workouts`);
          resolve({
            events: cached.slice(0, limit),
            fromCache: true
          });
        } else {
          // Fallback to network query
          const result = await this.queryAuthorAndKind(pubkey, limit);
          resolve({
            ...result,
            fromCache: false
          });
        }
      } catch (error) {
        resolve({ events: [], error: error.message });
      }
    });
  }

  /**
   * Run all performance tests
   */
  async runAllTests() {
    console.log('🚀 Starting Workout Query Performance Tests\n');
    console.log('='.repeat(60));
    
    const { TEST_PUBKEY } = TEST_CONFIG;
    
    if (!TEST_PUBKEY || TEST_PUBKEY === 'npub1234...') {
      console.error('❌ Please set a real TEST_PUBKEY in the script configuration');
      return;
    }

    // Test different strategies
    const testStrategies = [
      // Current approach with different timeouts
      ['Current (Author+Kind, 3s)', () => this.queryAuthorAndKind(TEST_PUBKEY, 100), 3000],
      ['Current (Author+Kind, 5s)', () => this.queryAuthorAndKind(TEST_PUBKEY, 100), 5000],
      ['Current (Author+Kind, 8s)', () => this.queryAuthorAndKind(TEST_PUBKEY, 100), 8000],
      
      // Recent-first strategies
      ['Recent 7 days', () => this.queryRecentFirst(TEST_PUBKEY, 7, 50), 5000],
      ['Recent 30 days', () => this.queryRecentFirst(TEST_PUBKEY, 30, 100), 5000],
      
      // Direct relay manager
      ['Relay Manager Direct', () => this.queryRelayManagerDirect(TEST_PUBKEY, 100), 5000],
      
      // Cached approach
      ['Cache-First Strategy', () => this.queryCachedFirst(TEST_PUBKEY, 100), 3000],
    ];

    const results = [];

    for (const [name, queryFn, timeout] of testStrategies) {
      const result = await this.testQueryStrategy(name, queryFn, timeout);
      results.push(result);
      
      // Wait between tests to avoid overwhelming relays
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Analyze and display results
    this.analyzeResults(results);
    
    return results;
  }

  /**
   * Analyze test results and provide recommendations
   */
  analyzeResults(results) {
    console.log('\n📊 PERFORMANCE ANALYSIS');
    console.log('='.repeat(60));
    
    // Filter successful results only
    const successfulResults = results.filter(r => r.success);
    
    if (successfulResults.length === 0) {
      console.log('❌ No successful queries found. Check network connectivity and pubkey.');
      return;
    }
    
    // Sort by duration (fastest first)
    successfulResults.sort((a, b) => a.duration - b.duration);
    
    console.log('\n🏆 SPEED RANKINGS:');
    successfulResults.forEach((result, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
      const eventsPerSec = result.duration > 0 ? (result.eventCount / (result.duration / 1000)).toFixed(1) : '∞';
      
      console.log(`${medal} ${result.strategyName}`);
      console.log(`    Duration: ${result.duration}ms | Events: ${result.eventCount} | Rate: ${eventsPerSec} events/sec`);
    });
    
    // Show failed strategies
    const failedResults = results.filter(r => !r.success);
    if (failedResults.length > 0) {
      console.log('\n❌ FAILED STRATEGIES:');
      failedResults.forEach(result => {
        console.log(`   ${result.strategyName}: ${result.errorMessage} (${result.duration}ms)`);
      });
    }
    
    // Recommendations
    const fastest = successfulResults[0];
    const slowest = successfulResults[successfulResults.length - 1];
    const speedup = slowest.duration / fastest.duration;
    
    console.log('\n💡 RECOMMENDATIONS:');
    console.log(`🏆 Fastest: ${fastest.strategyName} - ${fastest.duration}ms`);
    console.log(`🐌 Slowest: ${slowest.strategyName} - ${slowest.duration}ms`);
    console.log(`⚡ Potential speedup: ${speedup.toFixed(1)}x faster`);
    
    // Specific recommendations based on results
    if (fastest.strategyName.includes('Recent')) {
      console.log('\n✅ RECOMMENDATION: Implement recent-first loading strategy');
      console.log('   - Load recent workouts first for instant results');
      console.log('   - Load older workouts in background');
    }
    
    if (fastest.strategyName.includes('Cache')) {
      console.log('\n✅ RECOMMENDATION: Implement cache-first strategy');
      console.log('   - Show cached workouts instantly');
      console.log('   - Update cache in background');
    }
    
    if (fastest.timeout <= 3000) {
      console.log('\n✅ RECOMMENDATION: Use shorter timeouts with Promise.race');
      console.log('   - 3-second timeout provides best user experience');
      console.log('   - Implement timeout racing for faster perceived loading');
    }
  }
}

// Main execution
async function main() {
  try {
    const tester = new WorkoutQueryPerformanceTester();
    const results = await tester.runAllTests();
    
    console.log('\n🎯 Next steps based on results:');
    console.log('1. Implement the fastest strategy found above');
    console.log('2. Add cache-first loading for instant results');
    console.log('3. Use timeout racing with Promise.race');
    console.log('4. Implement background sync for cache updates');
    
  } catch (error) {
    console.error('💥 Test execution failed:', error);
    process.exit(1);
  }
}

// Export for use in other modules
export { WorkoutQueryPerformanceTester, TEST_CONFIG };

// Run tests if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}