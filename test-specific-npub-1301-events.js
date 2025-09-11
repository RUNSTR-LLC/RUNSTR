#!/usr/bin/env node

/**
 * Test Script: Specific Npub 1301 Event Discovery
 * 
 * Tests 1301 workout event discovery for specific npub using both:
 * 1. Current approach (NostrRelayManager pattern) - expected: ~3 events
 * 2. SimplePool breakthrough pattern - expected: 50+ events
 * 
 * This establishes baseline and verifies the SimplePool solution works
 * for 1301 events with author restrictions (unlike teams where all filters were removed)
 */

const { SimplePool, nip19 } = require('nostr-tools');

// Target npub for testing
const TARGET_NPUB = 'npub1xr8tvnnnr9aqt9vv30vj4vreeq2mk38mlwe7khvhvmzjqlcghh6sr85uum';

// Relay configuration (same as SimpleNostrService)
const RELAY_URLS = [
  'wss://relay.damus.io',     // Primary: 80% of events found here for teams
  'wss://nos.lol',           // Secondary: found team events  
  'wss://relay.primal.net',   // Tertiary: found team events
  'wss://nostr.wine',        // Quaternary: had LATAM team
  'wss://relay.nostr.band',  // Additional coverage
  'wss://relay.snort.social', // Enhanced coverage
  'wss://nostr-pub.wellorder.net' // Backup
];

async function convertNpubToHex(npub) {
  try {
    console.log(`🔄 Converting npub to hex: ${npub.slice(0, 20)}...`);
    const decoded = nip19.decode(npub);
    if (decoded.type !== 'npub') {
      throw new Error('Invalid npub format');
    }
    const hexPubkey = decoded.data;
    console.log(`✅ Converted to hex: ${hexPubkey.slice(0, 16)}...`);
    return hexPubkey;
  } catch (error) {
    console.error('❌ Error converting npub to hex:', error);
    throw error;
  }
}

async function testCurrentApproach(hexPubkey) {
  console.log('\n🟡 === TESTING CURRENT APPROACH (NostrRelayManager Pattern) ===');
  console.log('📋 Expected: ~3 events (same poor performance as team discovery before fix)');
  
  const pool = new SimplePool();
  const events = [];
  const TIMEOUT = 3000; // 3s timeout (current implementation)
  
  try {
    // Current approach: Limited time range, short timeout, early EOSE closure
    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);
    const filter = {
      authors: [hexPubkey],
      kinds: [1301],
      since: thirtyDaysAgo,
      limit: 50
    };

    console.log(`📡 Querying with current approach: since=${new Date(thirtyDaysAgo * 1000).toDateString()}, timeout=3s`);
    
    const timeoutPromise = new Promise((resolve) => {
      setTimeout(() => {
        console.log('⏱️ Current approach timeout (3s) - mimicking current behavior');
        resolve([]);
      }, TIMEOUT);
    });

    const queryPromise = pool.querySync(RELAY_URLS, filter);
    const results = await Promise.race([queryPromise, timeoutPromise]);
    
    // Filter for actual workout events
    const workoutEvents = results.filter(event => {
      if (event.kind !== 1301) return false;
      const hasWorkoutTags = event.tags.some(tag => 
        ['distance', 'duration', 'exercise', 'title', 'calories'].includes(tag[0])
      );
      return hasWorkoutTags;
    });

    events.push(...workoutEvents);
    pool.close(RELAY_URLS);

    console.log(`📊 Current approach results: ${events.length} workout events found`);
    if (events.length > 0) {
      console.log('📋 Sample events:');
      events.slice(0, 3).forEach((event, i) => {
        const exerciseTag = event.tags.find(tag => tag[0] === 'exercise');
        const durationTag = event.tags.find(tag => tag[0] === 'duration');
        console.log(`  ${i + 1}. ${exerciseTag?.[1] || 'Unknown'} (${durationTag?.[1] || 'Unknown'}) - ${new Date(event.created_at * 1000).toDateString()}`);
      });
    }
    
    return events.length;

  } catch (error) {
    console.error('❌ Current approach failed:', error);
    pool.close(RELAY_URLS);
    return 0;
  }
}

async function testSimplePoolBreakthrough(hexPubkey) {
  console.log('\n🟢 === TESTING SIMPLEPOOL BREAKTHROUGH APPROACH ===');
  console.log('📋 Expected: 50+ events (same dramatic improvement as team discovery)');
  
  const pool = new SimplePool();
  const allEvents = [];
  const processedEventIds = new Set();
  
  try {
    // STRATEGY 1: Multi-time-range approach (adapted from SimpleNostrService)
    console.log('🎯 Strategy 1: Multi-time-range queries with author restrictions...');
    
    const now = Math.floor(Date.now() / 1000);
    const day = 24 * 60 * 60;
    
    const timeRanges = [
      { name: 'Recent (0-7 days)', since: now - (7 * day), until: now, limit: 50 },
      { name: 'Week old (7-14 days)', since: now - (14 * day), until: now - (7 * day), limit: 50 },
      { name: 'Month old (14-30 days)', since: now - (30 * day), until: now - (14 * day), limit: 50 },
      { name: 'Older (30-90 days)', since: now - (90 * day), until: now - (30 * day), limit: 50 },
      { name: 'Historical (90-365 days)', since: now - (365 * day), until: now - (90 * day), limit: 75 },
      { name: 'Deep Historical (1+ years)', since: 0, until: now - (365 * day), limit: 100 }
    ];

    for (const timeRange of timeRanges) {
      console.log(`🕒 Querying ${timeRange.name}...`);
      
      const filter = {
        kinds: [1301],
        authors: [hexPubkey], // CRITICAL: Keep author restrictions for 1301 events
        limit: timeRange.limit,
        since: timeRange.since,
        until: timeRange.until
      };

      const rangeEvents = await queryWithSimplePoolOptimized(pool, filter, timeRange.name);
      
      // Add unique events
      for (const event of rangeEvents) {
        if (!processedEventIds.has(event.id)) {
          allEvents.push(event);
          processedEventIds.add(event.id);
        }
      }

      console.log(`   ${timeRange.name}: ${rangeEvents.length} events (${allEvents.length} total unique)`);
      
      // React Native breathing room
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // STRATEGY 2: Nuclear option with author restrictions
    console.log('🚀 Strategy 2: Nuclear approach (no time filters, keep author restrictions)...');
    
    const limits = [50, 100, 200, 500]; // Multiple limit attempts
    
    for (const limit of limits) {
      console.log(`🚀 Nuclear query with limit: ${limit}`);
      
      const filter = {
        kinds: [1301],
        authors: [hexPubkey], // CRITICAL: Keep author restrictions
        limit: limit
        // NO time filters - nuclear approach but keep authors
      };

      const nuclearEvents = await queryWithSimplePoolOptimized(pool, filter, `nuclear-${limit}`);
      
      // Add unique events
      for (const event of nuclearEvents) {
        if (!processedEventIds.has(event.id)) {
          allEvents.push(event);
          processedEventIds.add(event.id);
        }
      }

      console.log(`   Nuclear ${limit}: ${nuclearEvents.length} events (${allEvents.length} total unique)`);
      
      // React Native breathing room
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    pool.close(RELAY_URLS);

    // Filter for actual workout events
    const workoutEvents = allEvents.filter(event => {
      if (event.kind !== 1301) return false;
      const hasWorkoutTags = event.tags.some(tag => 
        ['distance', 'duration', 'exercise', 'title', 'calories'].includes(tag[0])
      );
      return hasWorkoutTags;
    });

    console.log(`📊 SimplePool breakthrough results: ${workoutEvents.length} workout events found`);
    if (workoutEvents.length > 0) {
      console.log('📋 Sample events:');
      workoutEvents.slice(0, 5).forEach((event, i) => {
        const exerciseTag = event.tags.find(tag => tag[0] === 'exercise');
        const durationTag = event.tags.find(tag => tag[0] === 'duration');
        const distanceTag = event.tags.find(tag => tag[0] === 'distance');
        const caloriesTag = event.tags.find(tag => tag[0] === 'calories');
        console.log(`  ${i + 1}. ${exerciseTag?.[1] || 'Unknown'} - ${durationTag?.[1] || '?'}min, ${distanceTag?.[1] || '?'}m, ${caloriesTag?.[1] || '?'}cal - ${new Date(event.created_at * 1000).toDateString()}`);
      });
      
      // Show date range
      const dates = workoutEvents.map(e => e.created_at).sort();
      const oldest = new Date(dates[0] * 1000);
      const newest = new Date(dates[dates.length - 1] * 1000);
      console.log(`📅 Date range: ${oldest.toDateString()} → ${newest.toDateString()}`);
    }
    
    return workoutEvents.length;

  } catch (error) {
    console.error('❌ SimplePool breakthrough failed:', error);
    pool.close(RELAY_URLS);
    return 0;
  }
}

async function queryWithSimplePoolOptimized(pool, filter, strategy) {
  const events = [];
  const timeout = 10000; // 10 second timeout (proven breakthrough approach)
  
  return new Promise((resolve) => {
    console.log(`📡 SimplePool query: ${strategy}`);
    
    const sub = pool.subscribeMany(
      RELAY_URLS,
      [filter],
      {
        onevent: (event) => {
          events.push(event);
        },
        oneose: () => {
          // 🔑 CRITICAL: NEVER close on EOSE in React Native!
          // Events arrive AFTER EOSE - this was the breakthrough!
          console.log(`📨 EOSE received for ${strategy} - but continuing to wait (breakthrough approach)...`);
        }
      }
    );

    // Wait full timeout regardless of EOSE (breakthrough approach)
    setTimeout(() => {
      console.log(`⏰ ${strategy} timeout complete: ${events.length} events collected`);
      sub.close();
      resolve(events);
    }, timeout);
  });
}

async function main() {
  console.log('🚀🚀🚀 1301 WORKOUT EVENT DISCOVERY TEST 🚀🚀🚀');
  console.log(`🎯 Testing specific npub: ${TARGET_NPUB}`);
  console.log('📊 Comparing current approach vs SimplePool breakthrough pattern');
  
  try {
    // Convert npub to hex for author filter
    const hexPubkey = await convertNpubToHex(TARGET_NPUB);
    
    // Test current approach
    const currentResults = await testCurrentApproach(hexPubkey);
    
    // Wait between tests
    console.log('\n⏸️ Waiting 2 seconds between tests...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test SimplePool breakthrough approach
    const breakthroughResults = await testSimplePoolBreakthrough(hexPubkey);
    
    // Final comparison
    console.log('\n🎯🎯🎯 FINAL RESULTS COMPARISON 🎯🎯🎯');
    console.log(`📊 Current approach: ${currentResults} workout events`);
    console.log(`📊 SimplePool breakthrough: ${breakthroughResults} workout events`);
    
    if (breakthroughResults > currentResults) {
      const improvement = breakthroughResults > 0 ? (breakthroughResults / Math.max(currentResults, 1)) : 0;
      console.log(`🚀 IMPROVEMENT: ${improvement.toFixed(1)}x more events found!`);
      console.log(`✅ SUCCESS: SimplePool breakthrough pattern works for 1301 events!`);
    } else {
      console.log(`⚠️ WARNING: No improvement detected - investigate further`);
    }
    
    console.log('\n🎯 Ready to implement SimpleWorkoutService with this proven pattern!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  main();
}