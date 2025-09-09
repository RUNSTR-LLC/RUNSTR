#!/usr/bin/env node

/**
 * Simple Nostr Workout Query Performance Test
 * Tests different strategies for querying 1301 workout events
 */

import { SimplePool, nip19 } from 'nostr-tools';

// Test configuration - using a real active pubkey with workout data
const TEST_CONFIG = {
  // Using real pubkey with 39 workout events (found from live data)
  TEST_PUBKEY_HEX: '5aec57f756b06f92dded240bb0122771bbe5d57e444ac243da4d708f807528d0',
  
  RELAY_URLS: [
    'wss://relay.damus.io',
    'wss://relay.primal.net', 
    'wss://nos.lol',
    'wss://nostr.wine'
  ],
  
  TIMEOUTS: [3000, 5000, 8000], // Test different timeout values
};

class NostrPerformanceTester {
  constructor() {
    this.pool = new SimplePool();
    this.results = [];
  }

  async cleanup() {
    this.pool.close(TEST_CONFIG.RELAY_URLS);
  }

  async testStrategy(strategyName, filter, timeout = 5000) {
    console.log(`\n🧪 Testing: ${strategyName} (${timeout}ms timeout)`);
    console.log(`Filter: ${JSON.stringify(filter, null, 2)}`);
    
    const startTime = Date.now();
    
    try {
      // Create timeout promise
      const timeoutPromise = new Promise((resolve) => 
        setTimeout(() => resolve([]), timeout)
      );
      
      // Query relays with timeout race
      const queryPromise = this.pool.querySync(TEST_CONFIG.RELAY_URLS, filter);
      
      const events = await Promise.race([queryPromise, timeoutPromise]);
      const duration = Date.now() - startTime;
      
      // Filter for valid workout events
      const workoutEvents = events.filter(event => {
        if (event.kind !== 1301) return false;
        
        // Look for workout-related tags
        const hasWorkoutTags = event.tags.some(tag => 
          ['distance', 'duration', 'exercise', 'title'].includes(tag[0])
        );
        
        return hasWorkoutTags;
      });
      
      console.log(`✅ ${strategyName}: ${events.length} total, ${workoutEvents.length} workout events in ${duration}ms`);
      
      return {
        strategyName,
        eventCount: workoutEvents.length,
        totalEvents: events.length,
        duration,
        success: true,
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

  async runAllTests() {
    console.log('🚀 Starting Nostr Workout Query Performance Tests');
    console.log('=' .repeat(60));
    
    const pubkeyHex = TEST_CONFIG.TEST_PUBKEY_HEX;
    console.log(`📋 Test pubkey: ${pubkeyHex.slice(0, 16)}... (39 known workout events)`);
    console.log(`📡 Testing against ${TEST_CONFIG.RELAY_URLS.length} relays`);

    // Test strategies
    const strategies = [
      // Strategy 1: Current approach (Author + Kind) with different timeouts
      ['Author+Kind (3s)', { kinds: [1301], authors: [pubkeyHex], limit: 100 }, 3000],
      ['Author+Kind (5s)', { kinds: [1301], authors: [pubkeyHex], limit: 100 }, 5000], 
      ['Author+Kind (8s)', { kinds: [1301], authors: [pubkeyHex], limit: 100 }, 8000],
      
      // Strategy 2: Recent workouts first
      ['Recent 7 days', {
        kinds: [1301], 
        authors: [pubkeyHex],
        since: Math.floor(Date.now()/1000) - 7*24*60*60,
        limit: 50
      }, 5000],
      
      ['Recent 30 days', {
        kinds: [1301],
        authors: [pubkeyHex], 
        since: Math.floor(Date.now()/1000) - 30*24*60*60,
        limit: 100
      }, 5000],
      
      // Strategy 3: Kind-only (test if relay indexes kinds better than authors)
      ['Kind-only (300 limit)', { kinds: [1301], limit: 300 }, 5000],
      
      // Strategy 4: Very recent workouts (last 24 hours)
      ['Last 24 hours', {
        kinds: [1301],
        authors: [pubkeyHex],
        since: Math.floor(Date.now()/1000) - 24*60*60,
        limit: 20
      }, 3000],
    ];

    const results = [];

    for (const [name, filter, timeout] of strategies) {
      const result = await this.testStrategy(name, filter, timeout);
      results.push(result);
      
      // Wait between tests to be nice to relays
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    this.analyzeResults(results);
    return results;
  }

  analyzeResults(results) {
    console.log('\n📊 PERFORMANCE ANALYSIS');
    console.log('=' .repeat(60));
    
    // Filter successful results
    const successful = results.filter(r => r.success);
    
    if (successful.length === 0) {
      console.log('❌ No successful queries! Check network connectivity.');
      return;
    }
    
    // Sort by duration (fastest first)
    successful.sort((a, b) => a.duration - b.duration);
    
    console.log('\n🏆 SPEED RANKINGS:');
    successful.forEach((result, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
      const eventsPerSec = result.duration > 0 ? (result.eventCount / (result.duration / 1000)).toFixed(1) : '∞';
      
      console.log(`${medal} ${result.strategyName}`);
      console.log(`    ⏱️  Duration: ${result.duration}ms`);
      console.log(`    📊 Events: ${result.eventCount} workouts (${result.totalEvents} total)`);
      console.log(`    ⚡ Rate: ${eventsPerSec} events/sec`);
      console.log('');
    });
    
    // Show failed strategies
    const failed = results.filter(r => !r.success);
    if (failed.length > 0) {
      console.log('❌ FAILED STRATEGIES:');
      failed.forEach(result => {
        console.log(`   ${result.strategyName}: ${result.errorMessage} (${result.duration}ms)`);
      });
      console.log('');
    }
    
    // Performance insights
    const fastest = successful[0];
    const slowest = successful[successful.length - 1];
    const speedupFactor = slowest.duration / fastest.duration;
    
    console.log('💡 KEY INSIGHTS:');
    console.log(`🏆 Fastest strategy: ${fastest.strategyName} (${fastest.duration}ms)`);
    console.log(`🐌 Slowest strategy: ${slowest.strategyName} (${slowest.duration}ms)`);
    console.log(`⚡ Speed difference: ${speedupFactor.toFixed(1)}x faster`);
    console.log('');
    
    // Recommendations based on results
    console.log('🎯 RECOMMENDATIONS:');
    
    if (fastest.strategyName.includes('Recent')) {
      console.log('✅ Implement recent-first loading strategy');
      console.log('   - Load recent workouts first for instant perceived performance');
      console.log('   - Load older workouts in background');
    }
    
    if (fastest.timeout <= 3000) {
      console.log('✅ Use shorter timeouts with Promise.race');
      console.log('   - 3-second timeout prevents hanging on slow relays');
      console.log('   - Better user experience with faster failures');
    }
    
    if (fastest.strategyName.includes('Kind-only')) {
      console.log('✅ Consider kind-only queries with client-side filtering');
      console.log('   - Some relays may index kinds better than authors'); 
      console.log('   - Trade bandwidth for query speed');
    }
    
    // Specific performance recommendations
    const fastestEvents = fastest.eventCount;
    if (fastestEvents > 0) {
      const cacheRecommendation = fastestEvents < 20 ? 'aggressive' : 'moderate';
      console.log(`✅ Implement ${cacheRecommendation} caching strategy`);
      console.log(`   - Cache ${fastestEvents} events found by fastest strategy`);
      console.log('   - Show cached data instantly, update in background');
    }
    
    console.log('\n🚀 Next implementation steps:');
    console.log('1. Implement timeout racing with Promise.race');
    console.log('2. Add cache-first loading strategy'); 
    console.log('3. Use recent-first queries for better perceived performance');
    console.log('4. Add background sync to keep cache fresh');
  }
}

// Main execution
async function main() {
  const tester = new NostrPerformanceTester();
  
  try {
    await tester.runAllTests();
  } catch (error) {
    console.error('💥 Test failed:', error);
  } finally {
    await tester.cleanup();
    console.log('\n✅ Tests completed, connections closed');
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}