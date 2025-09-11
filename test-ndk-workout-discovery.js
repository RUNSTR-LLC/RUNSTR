/**
 * Test NDK Workout Discovery Service
 * 
 * Tests the new NDK-based workout service against the known successful npub
 * that should return 113 workout events.
 * 
 * Expected Result: 113 workout events (matching previous successful tests)
 */

const NDK = require('@nostr-dev-kit/ndk').default;
const { nip19 } = require('nostr-tools');

// Test configuration - same as previous successful tests
const TEST_NPUB = 'npub1xr8tvnnnr9aqt9vv30vj4vreeq2mk38mlwe7khvhvmzjqlcghh6sr85uum';
const EXPECTED_HEX = '30ceb64e73197a05958c8bd92ab079c815bb44fbfbb3eb5d9766c5207f08bdf5';
const EXPECTED_WORKOUT_COUNT = 113; // Based on previous successful tests

// Relay configuration - optimized for 1301 events
const RELAY_URLS = [
  'wss://relay.damus.io',
  'wss://nos.lol', 
  'wss://relay.primal.net',
  'wss://nostr.wine',
  'wss://relay.nostr.band',
  'wss://relay.snort.social',
  'wss://nostr-pub.wellorder.net'
];

class NdkWorkoutTester {
  constructor() {
    this.ndk = null;
    this.isReady = false;
  }

  /**
   * Initialize NDK with Zap-Arena proven patterns
   */
  async initializeNDK() {
    console.log('🚀 Initializing NDK for workout discovery test...');
    console.log(`📡 Using relays: ${RELAY_URLS.join(', ')}`);
    
    this.ndk = new NDK({
      explicitRelayUrls: RELAY_URLS
      // debug: true // Disabled due to Node.js compatibility issue
    });

    try {
      const connectTimeoutMs = 30000; // Zap-Arena proven timeout
      console.log(`⏰ Connecting to NDK with ${connectTimeoutMs}ms timeout...`);
      
      await this.ndk.connect(connectTimeoutMs);
      
      const connectedCount = this.ndk.pool?.stats()?.connected || 0;
      console.log(`✅ NDK connected. Active relays: ${connectedCount}`);
      console.log(`📊 Pool stats:`, this.ndk.pool?.stats());
      
      if (connectedCount > 0) {
        this.isReady = true;
        return true;
      } else {
        throw new Error('No relays connected');
      }
    } catch (error) {
      console.error('❌ NDK connection failed:', error);
      this.isReady = false;
      return false;
    }
  }

  /**
   * Convert npub to hex pubkey with validation
   */
  convertNpubToHex(npub) {
    console.log(`🔧 Converting npub to hex: ${npub}`);
    
    try {
      const decoded = nip19.decode(npub);
      
      if (decoded.type !== 'npub') {
        throw new Error('Invalid npub format');
      }
      
      const hexPubkey = decoded.data;
      
      if (hexPubkey.length !== 64) {
        throw new Error(`Invalid hex length: ${hexPubkey.length}, expected 64`);
      }
      
      // Validate against expected conversion
      if (npub === TEST_NPUB && hexPubkey === EXPECTED_HEX) {
        console.log('🎯 PERFECT MATCH: Npub converted to expected hex!');
        console.log('🚀 This should find 113 workout events');
      }
      
      console.log(`✅ Conversion successful: ${hexPubkey}`);
      return hexPubkey;
      
    } catch (error) {
      console.error('❌ Npub conversion failed:', error);
      throw error;
    }
  }

  /**
   * Test NDK subscription-based discovery (Zap-Arena pattern)
   */
  async testNdkSubscriptionDiscovery(hexPubkey) {
    if (!this.isReady) {
      throw new Error('NDK not ready for testing');
    }

    console.log('\n🎯 TESTING NDK SUBSCRIPTION-BASED 1301 DISCOVERY');
    console.log('='.repeat(60));
    
    const allEvents = [];
    const processedEventIds = new Set();
    let subscriptionStats = {
      subscriptionsCreated: 0,
      eventsReceived: 0,
      timeoutsCaught: 0
    };

    const startTime = Date.now();

    // STRATEGY 1: Multi-time-range subscriptions
    console.log('\n📅 STRATEGY 1: Multi-time-range subscriptions');
    await this.testMultiTimeRangeSubscriptions(hexPubkey, allEvents, processedEventIds, subscriptionStats);

    // STRATEGY 2: Nuclear subscription (no time filters)
    if (allEvents.length < 100) {
      console.log('\n🚀 STRATEGY 2: Nuclear subscription (no time filters)');
      await this.testNuclearSubscription(hexPubkey, allEvents, processedEventIds, subscriptionStats);
    }

    const queryTime = Date.now() - startTime;

    // Results summary
    console.log('\n📊 NDK SUBSCRIPTION TEST RESULTS');
    console.log('='.repeat(60));
    console.log(`⏰ Total query time: ${queryTime}ms`);
    console.log(`📥 Total events collected: ${allEvents.length}`);
    console.log(`🔄 Unique events processed: ${processedEventIds.size}`);
    console.log(`📡 Subscriptions created: ${subscriptionStats.subscriptionsCreated}`);
    console.log(`📨 Events received via subscriptions: ${subscriptionStats.eventsReceived}`);
    console.log(`⏱️ Timeouts caught: ${subscriptionStats.timeoutsCaught}`);
    
    // Compare with expected results
    if (allEvents.length >= EXPECTED_WORKOUT_COUNT) {
      console.log(`✅ SUCCESS: Found ${allEvents.length} events (expected ${EXPECTED_WORKOUT_COUNT})`);
      console.log('🎯 NDK subscription approach is working correctly!');
    } else {
      console.log(`⚠️ PARTIAL: Found ${allEvents.length} events (expected ${EXPECTED_WORKOUT_COUNT})`);
      console.log('🔍 NDK may need further optimization');
    }

    return {
      success: allEvents.length > 0,
      eventsFound: allEvents.length,
      queryTime,
      subscriptionStats,
      expectedCount: EXPECTED_WORKOUT_COUNT,
      meetsExpectation: allEvents.length >= EXPECTED_WORKOUT_COUNT
    };
  }

  /**
   * Test multi-time-range subscription strategy
   */
  async testMultiTimeRangeSubscriptions(hexPubkey, allEvents, processedEventIds, subscriptionStats) {
    const now = Math.floor(Date.now() / 1000);
    const day = 24 * 60 * 60;
    
    const timeRanges = [
      { name: 'Recent (0-7 days)', since: now - (7 * day), until: now, limit: 50 },
      { name: 'Week old (7-14 days)', since: now - (14 * day), until: now - (7 * day), limit: 50 },
      { name: 'Month old (14-30 days)', since: now - (30 * day), until: now - (14 * day), limit: 50 },
      { name: 'Older (30-90 days)', since: now - (90 * day), until: now - (30 * day), limit: 75 },
      { name: 'Historical (90-365 days)', since: now - (365 * day), until: now - (90 * day), limit: 100 },
      { name: 'Deep Historical (1+ years)', since: 0, until: now - (365 * day), limit: 50 }
    ];

    for (const timeRange of timeRanges) {
      console.log(`📅 Testing ${timeRange.name}...`);
      
      const filter = {
        kinds: [1301],
        authors: [hexPubkey],
        limit: timeRange.limit,
        since: timeRange.since,
        until: timeRange.until
      };

      const rangeEvents = await this.subscribeWithTimeout(filter, timeRange.name, subscriptionStats);
      
      // Add unique events
      let uniqueAdded = 0;
      for (const event of rangeEvents) {
        if (!processedEventIds.has(event.id)) {
          allEvents.push(event);
          processedEventIds.add(event.id);
          uniqueAdded++;
        }
      }

      console.log(`   📊 ${timeRange.name}: ${rangeEvents.length} events, ${uniqueAdded} unique added`);
      
      // Brief pause between ranges
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  /**
   * Test nuclear subscription strategy (no time filters)
   */
  async testNuclearSubscription(hexPubkey, allEvents, processedEventIds, subscriptionStats) {
    const limits = [100, 200, 500];
    
    for (const limit of limits) {
      console.log(`🚀 Testing nuclear subscription with limit: ${limit}`);
      
      const filter = {
        kinds: [1301],
        authors: [hexPubkey],
        limit: limit
        // NO time filters
      };

      const nuclearEvents = await this.subscribeWithTimeout(filter, `nuclear-${limit}`, subscriptionStats);
      
      // Add unique events
      let uniqueAdded = 0;
      for (const event of nuclearEvents) {
        if (!processedEventIds.has(event.id)) {
          allEvents.push(event);
          processedEventIds.add(event.id);
          uniqueAdded++;
        }
      }

      console.log(`   🚀 Nuclear ${limit}: ${nuclearEvents.length} events, ${uniqueAdded} unique added`);
      
      // Brief pause between attempts
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

  /**
   * Core NDK subscription with timeout (Zap-Arena pattern)
   */
  async subscribeWithTimeout(filter, strategy, subscriptionStats) {
    const events = [];
    const timeout = 8000; // 8 second timeout
    
    return new Promise((resolve) => {
      console.log(`   📡 Creating NDK subscription for ${strategy}...`);
      
      const subscription = this.ndk.subscribe(filter, {
        closeOnEose: false, // Keep subscription open for late events
      });
      
      subscriptionStats.subscriptionsCreated++;
      
      subscription.on('event', (event) => {
        // Validate it's a workout event
        if (event.kind === 1301) {
          const hasWorkoutTags = event.tags?.some(tag => 
            ['distance', 'duration', 'exercise', 'title', 'calories'].includes(tag[0])
          );
          if (hasWorkoutTags) {
            events.push(event);
            subscriptionStats.eventsReceived++;
            console.log(`     📥 Workout event ${events.length}: ${event.id?.slice(0, 8)}`);
          }
        }
      });
      
      subscription.on('eose', () => {
        console.log(`     📨 EOSE received for ${strategy}, continuing to wait...`);
      });

      // Timeout with cleanup
      setTimeout(() => {
        console.log(`     ⏰ ${strategy} timeout complete: ${events.length} events collected`);
        subscription.stop();
        subscriptionStats.timeoutsCaught++;
        resolve(events);
      }, timeout);
    });
  }

  /**
   * Test NDK fetchEvents method for comparison
   */
  async testNdkFetchEvents(hexPubkey) {
    if (!this.isReady) {
      throw new Error('NDK not ready for testing');
    }

    console.log('\n🔄 TESTING NDK FETCHEVENTS METHOD (for comparison)');
    console.log('='.repeat(60));
    
    const startTime = Date.now();
    
    try {
      const filter = {
        kinds: [1301],
        authors: [hexPubkey],
        limit: 500 // High limit for comprehensive fetch
      };

      console.log('📡 Executing ndk.fetchEvents()...');
      const eventsSet = await this.ndk.fetchEvents(filter, { 
        timeoutMs: 10000 // 10 second timeout
      });
      
      const events = Array.from(eventsSet);
      const queryTime = Date.now() - startTime;
      
      console.log(`📊 NDK fetchEvents results:`);
      console.log(`   ⏰ Query time: ${queryTime}ms`);
      console.log(`   📥 Events found: ${events.length}`);
      
      // Compare with expected results
      if (events.length >= EXPECTED_WORKOUT_COUNT) {
        console.log(`✅ SUCCESS: Found ${events.length} events (expected ${EXPECTED_WORKOUT_COUNT})`);
      } else {
        console.log(`⚠️ PARTIAL: Found ${events.length} events (expected ${EXPECTED_WORKOUT_COUNT})`);
      }

      return {
        success: events.length > 0,
        eventsFound: events.length,
        queryTime,
        expectedCount: EXPECTED_WORKOUT_COUNT,
        meetsExpectation: events.length >= EXPECTED_WORKOUT_COUNT
      };
      
    } catch (error) {
      console.error('❌ NDK fetchEvents failed:', error);
      return {
        success: false,
        eventsFound: 0,
        queryTime: Date.now() - startTime,
        error: error.message
      };
    }
  }

  /**
   * Run comprehensive NDK workout discovery test
   */
  async runComprehensiveTest() {
    console.log('🧪 STARTING COMPREHENSIVE NDK WORKOUT DISCOVERY TEST');
    console.log('='.repeat(80));
    console.log(`🎯 Target: ${TEST_NPUB}`);
    console.log(`🎯 Expected: ${EXPECTED_WORKOUT_COUNT} workout events`);
    console.log('='.repeat(80));

    try {
      // Step 1: Initialize NDK
      const initSuccess = await this.initializeNDK();
      if (!initSuccess) {
        throw new Error('Failed to initialize NDK');
      }

      // Step 2: Convert npub to hex
      const hexPubkey = this.convertNpubToHex(TEST_NPUB);

      // Step 3: Test subscription-based discovery
      const subscriptionResults = await this.testNdkSubscriptionDiscovery(hexPubkey);

      // Step 4: Test fetchEvents method for comparison
      const fetchResults = await this.testNdkFetchEvents(hexPubkey);

      // Step 5: Final comparison
      console.log('\n📈 FINAL COMPARISON: NDK vs Expected Results');
      console.log('='.repeat(80));
      console.log(`📊 Subscription approach: ${subscriptionResults.eventsFound} events`);
      console.log(`📊 FetchEvents approach: ${fetchResults.eventsFound} events`);
      console.log(`🎯 Expected target: ${EXPECTED_WORKOUT_COUNT} events`);
      console.log(`✅ Subscription meets expectation: ${subscriptionResults.meetsExpectation}`);
      console.log(`✅ FetchEvents meets expectation: ${fetchResults.meetsExpectation}`);

      // Determine best approach
      const bestMethod = subscriptionResults.eventsFound >= fetchResults.eventsFound ? 'Subscription' : 'FetchEvents';
      const bestCount = Math.max(subscriptionResults.eventsFound, fetchResults.eventsFound);
      
      console.log(`🏆 Best NDK method: ${bestMethod} with ${bestCount} events`);
      
      if (bestCount >= EXPECTED_WORKOUT_COUNT) {
        console.log('🎉 SUCCESS: NDK implementation successfully matches expected performance!');
      } else {
        console.log('⚠️ NEEDS OPTIMIZATION: NDK implementation below expected performance');
      }

      return {
        overall: {
          success: bestCount >= EXPECTED_WORKOUT_COUNT,
          bestMethod,
          bestCount,
          expectedCount: EXPECTED_WORKOUT_COUNT
        },
        subscription: subscriptionResults,
        fetchEvents: fetchResults
      };

    } catch (error) {
      console.error('❌ COMPREHENSIVE TEST FAILED:', error);
      return {
        overall: { success: false, error: error.message },
        subscription: null,
        fetchEvents: null
      };
    } finally {
      // Cleanup
      if (this.ndk) {
        console.log('\n🧹 Cleaning up NDK connections...');
        for (const relay of this.ndk.pool?.relays?.values() || []) {
          relay.disconnect();
        }
      }
    }
  }
}

// Execute the test
async function main() {
  const tester = new NdkWorkoutTester();
  const results = await tester.runComprehensiveTest();
  
  console.log('\n🏁 TEST COMPLETE');
  console.log('Results saved for analysis:', JSON.stringify(results, null, 2));
  
  process.exit(results.overall.success ? 0 : 1);
}

if (require.main === module) {
  main().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = { NdkWorkoutTester };