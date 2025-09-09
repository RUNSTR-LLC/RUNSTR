/**
 * Verify NIP-1301 Events for User's npub
 * 
 * This script checks if the user has any NIP-1301 compliant workout events
 * vs RUNSTR social posts, and explains why no workouts are showing.
 */

const { SimplePool, nip19 } = require('nostr-tools');

const RELAY_URLS = [
  'wss://relay.damus.io',
  'wss://relay.primal.net', 
  'wss://nostr.wine',
  'wss://nos.lol'
];

async function analyzeWorkoutEvents(npub) {
  console.log('🔍 Analyzing workout events for:', npub);
  
  const decoded = nip19.decode(npub);
  const hexPubkey = decoded.data;
  
  const pool = new SimplePool();
  let totalEvents = 0;
  let nip1301Events = 0;
  let runstrSocialEvents = 0;
  
  const results = await new Promise(resolve => {
    const sub = pool.subscribeMany(RELAY_URLS, [{
      kinds: [1301],
      authors: [hexPubkey],
      limit: 100
    }], {
      onevent: (event) => {
        totalEvents++;
        
        // Check if NIP-1301 compliant
        const hasExerciseTag = event.tags.some(tag => tag[0] === 'exercise');
        const hasStartTag = event.tags.some(tag => tag[0] === 'start');
        const hasTypeTag = event.tags.some(tag => tag[0] === 'type');
        
        let isJsonContent = false;
        try {
          JSON.parse(event.content);
          isJsonContent = true;
        } catch {
          isJsonContent = false;
        }
        
        const isNip1301 = hasExerciseTag && (hasStartTag || hasTypeTag) && isJsonContent;
        
        if (isNip1301) {
          nip1301Events++;
          console.log(`✅ NIP-1301 Event Found: ${event.id.substring(0, 16)}...`);
          console.log(`   Content: ${event.content.substring(0, 50)}...`);
        } else {
          runstrSocialEvents++;
          if (runstrSocialEvents <= 3) {
            console.log(`❌ RUNSTR Social Post: ${event.id.substring(0, 16)}...`);
            console.log(`   Content: ${event.content}`);
          }
        }
      },
      oneose: () => {
        setTimeout(() => {
          sub.close();
          resolve({ totalEvents, nip1301Events, runstrSocialEvents });
        }, 1000);
      }
    });
  });
  
  pool.close(RELAY_URLS);
  
  console.log('\n📊 ANALYSIS RESULTS:');
  console.log(`   Total kind 1301 events: ${totalEvents}`);
  console.log(`   NIP-1301 workout events: ${nip1301Events}`);
  console.log(`   RUNSTR social posts: ${runstrSocialEvents}`);
  console.log(`   ${runstrSocialEvents > 3 ? '(and more...)' : ''}`);
  
  console.log('\n🎯 EXPLANATION:');
  if (nip1301Events === 0 && runstrSocialEvents > 0) {
    console.log('❌ NO NIP-1301 WORKOUT EVENTS FOUND');
    console.log('✅ The parser is working correctly - it filtered out social posts');
    console.log('📝 All events are RUNSTR social posts, not structured workout data');
    console.log('\n💡 SOLUTION OPTIONS:');
    console.log('   1. Find a different npub with real NIP-1301 workout events');
    console.log('   2. Create NIP-1301 test events to populate the app');
    console.log('   3. Extend parser to handle RUNSTR format (not recommended)');
  } else if (nip1301Events > 0) {
    console.log('✅ NIP-1301 EVENTS FOUND - App should display workouts');
    console.log('🔧 If app still shows no workouts, check app logs for other issues');
  } else {
    console.log('❌ NO WORKOUT EVENTS OF ANY FORMAT FOUND');
  }
}

// Run analysis
const npub = process.argv[2];
if (!npub) {
  console.error('Usage: node verify-nip1301-events.js <npub>');
  process.exit(1);
}

analyzeWorkoutEvents(npub).catch(console.error);