#!/usr/bin/env node

/**
 * Test Workout Discovery Script - Find ALL kind 1301 events for a pubkey
 * 
 * ULTRA NUCLEAR APPROACH: Zero filtering, zero validation
 * Based on successful team discovery patterns + React Native ultra nuclear approach
 * 
 * Usage: node test-workout-discovery.js [npub_or_hex_pubkey]
 */

const { SimplePool, nip19 } = require('nostr-tools');

// Configuration
const DEFAULT_NPUB = 'npub1xr8tvnnnr9aqt9vv30vj4vreeq2mk38mlwe7khvhvmzjqlcghh6sr85uum'; // Current logged in user
const TARGET_HEX = '30ceb64e73197a05958c8bd92ab079c815bb44fbfbb3eb5d9766c5207f08bdf5'; // Expected hex for 113 events

// Comprehensive relay list (more than React Native app uses)
const RELAY_URLS = [
  'wss://relay.damus.io',           // Primary - most important
  'wss://nos.lol',                  // Secondary  
  'wss://relay.primal.net',         // Tertiary
  'wss://nostr.wine',              // Quaternary
  'wss://relay.nostr.band',        // Additional
  'wss://relay.snort.social',      // Additional
  'wss://nostr-pub.wellorder.net', // Additional
  'wss://relay.nostrich.de',       // Extra coverage
  'wss://nostr.oxtr.dev',          // Extra coverage
  'wss://relay.wellorder.net',     // Extra coverage
];

async function convertNpubToHex(npub) {
  console.log('🔧 PUBKEY CONVERSION:');
  console.log(`📥 Input: "${npub}"`);
  console.log(`📏 Length: ${npub.length}`);
  
  try {
    if (!npub.startsWith('npub1')) {
      if (npub.length === 64 && /^[0-9a-f]+$/i.test(npub)) {
        console.log('✅ Already hex format');
        return npub;
      }
      throw new Error('Invalid format - not npub1 or hex');
    }

    const decoded = nip19.decode(npub);
    const hexPubkey = decoded.data;
    
    console.log(`📤 Output hex: "${hexPubkey}"`);
    console.log(`📏 Output length: ${hexPubkey.length}`);
    
    // Critical validation
    if (hexPubkey.length !== 64) {
      throw new Error(`Invalid hex length: ${hexPubkey.length}, expected 64`);
    }
    
    // Test against known conversion
    if (npub === DEFAULT_NPUB) {
      if (hexPubkey === TARGET_HEX) {
        console.log('🎯 SUCCESS: Matches expected target hex!');
      } else {
        console.log('⚠️ WARNING: Different from expected hex:');
        console.log(`   Expected: ${TARGET_HEX}`);
        console.log(`   Actual:   ${hexPubkey}`);
      }
    }
    
    console.log('✅ Conversion successful\n');
    return hexPubkey;
    
  } catch (error) {
    console.error('❌ Conversion failed:', error.message);
    process.exit(1);
  }
}

async function discoverWorkoutEvents(hexPubkey) {
  console.log('🚀🚀🚀 ULTRA NUCLEAR WORKOUT DISCOVERY SCRIPT 🚀🚀🚀');
  console.log(`📊 Target pubkey: ${hexPubkey.slice(0, 16)}...`);
  console.log(`🔍 Looking for ALL kind 1301 events - ZERO filtering\n`);
  
  const pool = new SimplePool();
  const allEvents = [];
  const eventsByRelay = {};
  const processedEventIds = new Set();
  
  // ULTRA NUCLEAR FILTER: Just kind + author - NO restrictions
  const filter = {
    kinds: [1301],
    authors: [hexPubkey],
    limit: 1000  // High limit to capture everything
    // NO time filters (since/until) - ultra nuclear
    // NO tag requirements - ultra nuclear
    // NO content requirements - ultra nuclear
  };
  
  console.log('🚀 ULTRA NUCLEAR FILTER:');
  console.log(JSON.stringify(filter, null, 2));
  console.log('');
  
  console.log(`📡 Querying ${RELAY_URLS.length} relays:`);
  RELAY_URLS.forEach((url, i) => {
    console.log(`  ${i + 1}. ${url}`);
    eventsByRelay[url] = [];
  });
  console.log('');

  return new Promise((resolve) => {
    const subscription = pool.subscribeMany(
      RELAY_URLS,
      [filter],
      {
        onevent: (event) => {
          // Find which relay this came from (approximate)
          const relayUrl = 'unknown_relay';
          
          console.log(`📥 RAW 1301 EVENT: ${event.id?.slice(0, 8)} from ${event.created_at ? new Date(event.created_at * 1000).toISOString() : 'no_date'}`);
          console.log(`   pubkey: ${event.pubkey?.slice(0, 16)}... kind: ${event.kind} tags: ${event.tags?.length || 0}`);
          
          // ULTRA NUCLEAR: Accept EVERYTHING - zero validation
          if (event.kind === 1301 && !processedEventIds.has(event.id)) {
            allEvents.push(event);
            processedEventIds.add(event.id);
            eventsByRelay[relayUrl] = eventsByRelay[relayUrl] || [];
            eventsByRelay[relayUrl].push(event);
            
            console.log(`✅ ULTRA NUCLEAR ACCEPT: Event ${allEvents.length} added`);
          }
          console.log('');
        },
        oneose: () => {
          console.log('📨 EOSE received - continuing to wait for full timeout...');
        }
      }
    );

    // Wait for events - testing with extreme minimal timeout
    console.log('⏰ Waiting 3 seconds for ALL events from all relays...\n');
    setTimeout(() => {
      subscription.close();
      pool.close(RELAY_URLS);
      resolve({ allEvents, eventsByRelay });
    }, 3000);
  });
}

function analyzeEvents(events) {
  console.log('🚀🚀🚀 ULTRA NUCLEAR RESULTS 🚀🚀🚀\n');
  
  console.log(`📊 TOTAL EVENTS FOUND: ${events.length}`);
  
  if (events.length === 0) {
    console.log('❌ NO EVENTS FOUND');
    console.log('   Possible reasons:');
    console.log('   1. User has no kind 1301 events published');
    console.log('   2. Events are on different relays not in our list');
    console.log('   3. Pubkey conversion issue');
    console.log('   4. This is not the user with 113 events');
    return;
  }
  
  // Date analysis
  const dates = events.map(e => e.created_at).sort((a, b) => a - b);
  const oldest = new Date(dates[0] * 1000);
  const newest = new Date(dates[dates.length - 1] * 1000);
  
  console.log(`📅 DATE RANGE: ${oldest.toDateString()} → ${newest.toDateString()}`);
  console.log(`⏰ SPAN: ${Math.round((dates[dates.length - 1] - dates[0]) / (24 * 60 * 60))} days\n`);
  
  // Sample events
  console.log('📋 SAMPLE EVENTS:');
  events.slice(0, 5).forEach((event, i) => {
    console.log(`${i + 1}. ${event.id.slice(0, 8)} - ${new Date(event.created_at * 1000).toDateString()}`);
    console.log(`   Tags: ${event.tags?.length || 0}, Content: ${event.content?.slice(0, 50) || 'empty'}...`);
  });
  
  if (events.length > 5) {
    console.log(`   ... and ${events.length - 5} more events`);
  }
  
  console.log('\n🎯 SUCCESS COMPARISON:');
  if (events.length >= 100) {
    console.log(`✅ FOUND ${events.length} EVENTS - This matches the expected high count!`);
  } else if (events.length >= 10) {
    console.log(`⚠️ Found ${events.length} events - More than app shows but less than expected ~113`);
  } else {
    console.log(`❌ Only found ${events.length} events - Same as app, suggests relay/user issue`);
  }
}

async function main() {
  const targetUser = process.argv[2] || DEFAULT_NPUB;
  
  console.log('🔍 ULTRA NUCLEAR WORKOUT DISCOVERY TEST\n');
  console.log(`🎯 Target user: ${targetUser}\n`);
  
  try {
    // Convert npub to hex
    const hexPubkey = await convertNpubToHex(targetUser);
    
    // Discover events with ultra nuclear approach
    const { allEvents, eventsByRelay } = await discoverWorkoutEvents(hexPubkey);
    
    // Analyze results
    analyzeEvents(allEvents);
    
    // Relay performance analysis
    console.log('\n📡 RELAY PERFORMANCE:');
    Object.entries(eventsByRelay).forEach(([relay, events]) => {
      if (events.length > 0) {
        console.log(`  ${relay}: ${events.length} events`);
      }
    });
    
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main().then(() => {
    console.log('\n🏁 Script completed');
    process.exit(0);
  });
}