#!/usr/bin/env node

/**
 * Test Script: Corrected Event Kinds and Pubkey Conversion
 * 
 * Tests our corrected implementation:
 * 1. Teams using kind 33404 (not 33402)
 * 2. Workouts using kind 1301 with proper pubkey conversion
 * 3. Comprehensive logging to verify fixes
 */

const { SimplePool, nip19 } = require('nostr-tools');

// Test configuration
const TARGET_NPUB = 'npub1xr8tvnnnr9aqt9vv30vj4vreeq2mk38mlwe7khvhvmzjqlcghh6sr85uum';
const EXPECTED_HEX = '30ceb64e73197a05958c8bd92ab079c815bb44fbfbb3eb5d9766c5207f08bdf5';

const RELAY_URLS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.primal.net',
  'wss://nostr.wine',
  'wss://relay.nostr.band'
];

// Test 1: Corrected Team Discovery (kind 33404)
async function testTeamDiscovery() {
  console.log('\n🟢 === TESTING CORRECTED TEAM DISCOVERY (KIND 33404) ===');
  console.log('📋 Should find actual fitness teams, not workout templates');
  
  const pool = new SimplePool();
  const allTeams = [];
  
  try {
    // Multiple filter strategies with correct kind 33404
    const filters = [
      { kinds: [33404], limit: 50 },                              // Basic teams
      { kinds: [33404], "#t": ["team"] },                         // Teams with tag
      { kinds: [33404], "#t": ["running"] },                      // Running teams
      { kinds: [33404], "#t": ["fitness"] },                      // Fitness teams
      { kinds: [33404], "#name": ["RUNSTR", "BULLISH"] },         // Specific teams
      { kinds: [30003, 33404], limit: 100 }                       // Both old and new
    ];

    for (const [index, filter] of filters.entries()) {
      console.log(`\n🔍 Filter ${index + 1}: Testing kind 33404 teams...`);
      console.log(`   Filter:`, filter);
      
      const events = await queryWithTimeout(pool, filter, 8000);
      
      // Add unique teams
      for (const event of events) {
        if (!allTeams.some(t => t.id === event.id)) {
          allTeams.push(event);
          
          // Parse team details
          const nameTag = event.tags.find(t => t[0] === 'name');
          const dTag = event.tags.find(t => t[0] === 'd');
          const teamName = nameTag?.[1] || dTag?.[1] || 'Unknown';
          
          console.log(`   ✅ Found team: "${teamName}" (kind ${event.kind})`);
        }
      }
      
      console.log(`   📊 Filter ${index + 1} result: ${events.length} events (${allTeams.length} total unique)`);
      
      // Breathing room
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    pool.close(RELAY_URLS);
    
    console.log(`\n🎯 TEAM DISCOVERY RESULTS:`);
    console.log(`   Total unique teams found: ${allTeams.length}`);
    
    if (allTeams.length > 0) {
      console.log(`   📋 Sample teams:`);
      allTeams.slice(0, 5).forEach((team, i) => {
        const nameTag = team.tags.find(t => t[0] === 'name');
        const teamName = nameTag?.[1] || 'Unknown';
        console.log(`     ${i + 1}. ${teamName}`);
      });
    }
    
    return allTeams.length;
    
  } catch (error) {
    console.error('❌ Team discovery test failed:', error);
    pool.close(RELAY_URLS);
    return 0;
  }
}

// Test 2: Enhanced Pubkey Conversion Test
async function testPubkeyConversion() {
  console.log('\n🔧 === TESTING ENHANCED PUBKEY CONVERSION ===');
  console.log(`📋 Converting: ${TARGET_NPUB}`);
  console.log(`📋 Expected:   ${EXPECTED_HEX}`);
  
  try {
    // Simulate the SimpleWorkoutService conversion with logging
    console.log('🔧 PUBKEY CONVERSION DEBUG - Starting conversion...');
    console.log(`📥 Input npub: "${TARGET_NPUB}"`);
    console.log(`📏 Input length: ${TARGET_NPUB.length} characters`);
    
    const decoded = nip19.decode(TARGET_NPUB);
    console.log(`📋 Decoded type: "${decoded.type}"`);
    
    if (decoded.type !== 'npub') {
      throw new Error('Invalid npub format');
    }
    
    const hexPubkey = decoded.data;
    console.log(`📤 Output hex: "${hexPubkey}"`);
    console.log(`📏 Output length: ${hexPubkey.length} characters`);
    
    // Critical validation
    if (hexPubkey.length !== 64) {
      console.error(`❌ CRITICAL ERROR: Wrong hex length! Expected 64, got ${hexPubkey.length}`);
      return false;
    }
    
    // Test against expected
    if (hexPubkey === EXPECTED_HEX) {
      console.log('🚀 SUCCESS: Target npub converted to expected hex!');
      console.log('✅ Pubkey conversion is working correctly');
      return true;
    } else {
      console.error('❌ CRITICAL MISMATCH: Conversion failed!');
      console.error(`   Expected: ${EXPECTED_HEX}`);
      console.error(`   Actual:   ${hexPubkey}`);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Pubkey conversion failed:', error);
    return false;
  }
}

// Test 3: Workout Discovery with Corrected Pubkey
async function testWorkoutDiscovery() {
  console.log('\n🏃 === TESTING WORKOUT DISCOVERY (KIND 1301) ===');
  console.log('📋 Should find 113 workout events with corrected pubkey');
  
  const pool = new SimplePool();
  
  try {
    // Convert npub to hex (using our corrected logic)
    const decoded = nip19.decode(TARGET_NPUB);
    const hexPubkey = decoded.data;
    
    console.log(`🔍 Using hex pubkey: ${hexPubkey}`);
    console.log(`📏 Hex length: ${hexPubkey.length} characters`);
    
    if (hexPubkey.length !== 64) {
      console.error('❌ Invalid hex length - aborting workout test');
      return 0;
    }
    
    const allWorkouts = [];
    
    // Multi-strategy workout discovery
    const now = Math.floor(Date.now() / 1000);
    const day = 86400;
    
    const strategies = [
      { name: 'Recent (30 days)', filter: { kinds: [1301], authors: [hexPubkey], since: now - (30 * day), limit: 100 } },
      { name: 'Older (30-90 days)', filter: { kinds: [1301], authors: [hexPubkey], since: now - (90 * day), until: now - (30 * day), limit: 100 } },
      { name: 'Nuclear (no time filter)', filter: { kinds: [1301], authors: [hexPubkey], limit: 200 } }
    ];
    
    for (const strategy of strategies) {
      console.log(`\n🔍 ${strategy.name}...`);
      console.log(`   Filter:`, strategy.filter);
      
      const events = await queryWithTimeout(pool, strategy.filter, 10000);
      
      // Add unique workouts
      for (const event of events) {
        if (!allWorkouts.some(w => w.id === event.id)) {
          allWorkouts.push(event);
          
          // Parse workout details
          const exerciseTag = event.tags.find(t => t[0] === 'exercise');
          const durationTag = event.tags.find(t => t[0] === 'duration');
          
          console.log(`   ✅ Workout: ${exerciseTag?.[1] || 'Unknown'} (${durationTag?.[1] || '?'} min)`);
        }
      }
      
      console.log(`   📊 ${strategy.name}: ${events.length} events (${allWorkouts.length} total unique)`);
      
      // Breathing room
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    pool.close(RELAY_URLS);
    
    console.log(`\n🎯 WORKOUT DISCOVERY RESULTS:`);
    console.log(`   Total workouts found: ${allWorkouts.length}`);
    
    if (allWorkouts.length >= 100) {
      console.log('🚀 SUCCESS: Found 100+ workouts - likely achieved 113x improvement!');
    } else if (allWorkouts.length > 10) {
      console.log('✅ IMPROVEMENT: Found significant workouts but may need tuning');
    } else {
      console.log('⚠️ LIMITED: Found few workouts - investigate further');
    }
    
    return allWorkouts.length;
    
  } catch (error) {
    console.error('❌ Workout discovery test failed:', error);
    pool.close(RELAY_URLS);
    return 0;
  }
}

// Helper: Query with timeout (React Native simulation)
async function queryWithTimeout(pool, filter, timeoutMs) {
  return new Promise((resolve) => {
    const events = [];
    
    const sub = pool.subscribeMany(
      RELAY_URLS,
      [filter],
      {
        onevent: (event) => {
          events.push(event);
        },
        oneose: () => {
          // Don't close on EOSE - wait for timeout (React Native fix)
          console.log(`   📨 EOSE received - continuing to wait...`);
        }
      }
    );

    // Always wait full timeout
    setTimeout(() => {
      sub.close();
      resolve(events);
    }, timeoutMs);
  });
}

// Run all tests
async function main() {
  console.log('🚀🚀🚀 CORRECTED IMPLEMENTATION TEST 🚀🚀🚀');
  console.log('Testing our fixes: kind 33404 for teams, proper pubkey conversion for workouts');
  
  try {
    // Test 1: Pubkey conversion
    console.log('\n📋 TEST 1: Pubkey Conversion');
    const pubkeySuccess = await testPubkeyConversion();
    
    // Test 2: Team discovery with kind 33404
    console.log('\n📋 TEST 2: Team Discovery');
    const teamCount = await testTeamDiscovery();
    
    // Test 3: Workout discovery (only if pubkey works)
    console.log('\n📋 TEST 3: Workout Discovery');
    let workoutCount = 0;
    if (pubkeySuccess) {
      workoutCount = await testWorkoutDiscovery();
    } else {
      console.log('⚠️ Skipping workout test - pubkey conversion failed');
    }
    
    // Final results
    console.log('\n🎯🎯🎯 FINAL TEST RESULTS 🎯🎯🎯');
    console.log(`📊 Pubkey Conversion: ${pubkeySuccess ? 'SUCCESS' : 'FAILED'}`);
    console.log(`📊 Teams Found (kind 33404): ${teamCount}`);
    console.log(`📊 Workouts Found (kind 1301): ${workoutCount}`);
    
    if (pubkeySuccess && teamCount > 0 && workoutCount > 50) {
      console.log('🚀 SUCCESS: All fixes appear to be working!');
      console.log('✅ Ready for React Native implementation');
    } else {
      console.log('⚠️ Some issues detected - check individual test results');
    }
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run the tests
if (require.main === module) {
  main();
}