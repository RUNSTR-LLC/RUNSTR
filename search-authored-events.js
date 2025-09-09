/**
 * Search for Kind 1301 Events AUTHORED by the npub
 * 
 * This script searches for events where the given npub is the AUTHOR,
 * not just mentioned in the event. This is the correct way to find
 * workout events created by a specific user.
 */

const { SimplePool, nip19 } = require('nostr-tools');

const RELAY_URLS = [
  'wss://relay.damus.io',
  'wss://relay.primal.net', 
  'wss://nostr.wine',
  'wss://nos.lol'
];

async function searchAuthoredEvents(npub) {
  console.log('🔍 Searching for kind 1301 events AUTHORED by:', npub);
  
  // Convert npub to hex pubkey
  const decoded = nip19.decode(npub);
  const hexPubkey = decoded.data;
  console.log('🔑 Hex pubkey (author):', hexPubkey);
  
  const pool = new SimplePool();
  let totalEvents = 0;
  const foundEvents = [];
  
  console.log('\n📡 Querying relays for authored events...');
  console.log('Filter:', JSON.stringify({
    kinds: [1301],
    authors: [hexPubkey], // This is the key - searching by AUTHORS
    limit: 100
  }, null, 2));
  
  const results = await new Promise(resolve => {
    const sub = pool.subscribeMany(RELAY_URLS, [{
      kinds: [1301],
      authors: [hexPubkey], // Search for events where this pubkey is the AUTHOR
      limit: 100
    }], {
      onevent: (event) => {
        totalEvents++;
        foundEvents.push(event);
        
        console.log(`\n📨 Event ${totalEvents}:`);
        console.log(`   ID: ${event.id.substring(0, 16)}...`);
        console.log(`   Author (pubkey): ${event.pubkey}`);
        console.log(`   Author matches query: ${event.pubkey === hexPubkey ? '✅' : '❌'}`);
        console.log(`   Created: ${new Date(event.created_at * 1000).toISOString()}`);
        console.log(`   Content: "${event.content.substring(0, 60)}${event.content.length > 60 ? '...' : ''}"`);
        console.log(`   Tags count: ${event.tags.length}`);
        
        // Show first few tags
        if (event.tags.length > 0) {
          console.log('   First tags:');
          event.tags.slice(0, 3).forEach((tag, i) => {
            console.log(`     ${i}: [${tag.map(t => `"${t}"`).join(', ')}]`);
          });
          if (event.tags.length > 3) {
            console.log(`     ... and ${event.tags.length - 3} more tags`);
          }
        }
      },
      oneose: () => {
        console.log('\n🏁 End of stored events reached');
        setTimeout(() => {
          sub.close();
          resolve({ totalEvents, foundEvents });
        }, 1000);
      }
    });
    
    // Add timeout in case no EOSE is received
    setTimeout(() => {
      console.log('\n⏰ Search timeout reached');
      sub.close();
      resolve({ totalEvents, foundEvents });
    }, 10000);
  });
  
  pool.close(RELAY_URLS);
  
  console.log('\n📊 SEARCH RESULTS:');
  console.log(`   Total events found: ${totalEvents}`);
  console.log(`   All events authored by queried pubkey: ${foundEvents.every(e => e.pubkey === hexPubkey) ? '✅' : '❌'}`);
  
  if (totalEvents > 0) {
    console.log('\n🎯 SUCCESS: Found workout events authored by this npub!');
    console.log('📝 These should be processable by the app');
    
    // Analyze event structure
    const sampleEvent = foundEvents[0];
    console.log('\n🔬 Sample event analysis:');
    console.log('   Content type:', typeof sampleEvent.content);
    console.log('   Content starts with:', sampleEvent.content.substring(0, 20));
    
    let isJson = false;
    try {
      JSON.parse(sampleEvent.content);
      isJson = true;
      console.log('   Content format: ✅ Valid JSON');
    } catch {
      console.log('   Content format: ❌ Plain text (not JSON)');
    }
    
    console.log(`   Has exercise tag: ${sampleEvent.tags.some(t => t[0] === 'exercise') ? '✅' : '❌'}`);
    console.log(`   Has start tag: ${sampleEvent.tags.some(t => t[0] === 'start') ? '✅' : '❌'}`);
    console.log(`   Has type tag: ${sampleEvent.tags.some(t => t[0] === 'type') ? '✅' : '❌'}`);
  } else {
    console.log('\n❌ NO EVENTS FOUND');
    console.log('This could mean:');
    console.log('   - The npub has not authored any kind 1301 events');
    console.log('   - The events are not stored on these relays');
    console.log('   - There might be a connection issue');
  }
}

// Run the search
const npub = process.argv[2];
if (!npub) {
  console.error('Usage: node search-authored-events.js <npub>');
  console.error('Example: node search-authored-events.js npub1abc123...');
  process.exit(1);
}

searchAuthoredEvents(npub).catch(console.error);