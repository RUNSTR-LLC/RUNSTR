/**
 * Standalone Nostr Event Debug Script
 * 
 * This script directly uses nostr-tools to fetch kind 1301 workout events
 * and shows us exactly what the events look like, helping debug parsing issues.
 * 
 * Usage: node debug-nostr-events.js <npub>
 */

const { SimplePool, nip19 } = require('nostr-tools');

// Same relays as the app uses
const RELAY_URLS = [
  'wss://relay.damus.io',
  'wss://relay.primal.net',
  'wss://nostr.wine',
  'wss://nos.lol'
];

async function debugNostrEvents(npub) {
  console.log('🔍 Starting Nostr Event Debug Script');
  console.log(`📡 Target npub: ${npub}`);
  
  let hexPubkey;
  try {
    // Convert npub to hex pubkey
    const decoded = nip19.decode(npub);
    if (decoded.type !== 'npub') {
      throw new Error('Invalid npub format');
    }
    hexPubkey = decoded.data;
    console.log(`🔑 Hex pubkey: ${hexPubkey}`);
  } catch (error) {
    console.error('❌ Failed to decode npub:', error);
    process.exit(1);
  }

  // Create connection pool
  const pool = new SimplePool();
  console.log(`🔄 Connecting to ${RELAY_URLS.length} relays...`);

  // Track events and stats
  let eventCount = 0;
  let parseSuccessCount = 0;
  let parseFailureCount = 0;
  const eventSamples = [];
  const parseErrors = [];

  try {
    // Subscribe to kind 1301 events for this pubkey
    const filter = {
      kinds: [1301],
      authors: [hexPubkey],
      limit: 5 // Get recent 5 events for tag analysis
    };

    console.log('📋 Filter:', JSON.stringify(filter, null, 2));
    console.log('⏳ Subscribing to events...');

    // Set up subscription using correct nostr-tools API
    const sub = pool.subscribeMany(RELAY_URLS, [filter], {
      onevent: (event) => {
        eventCount++;
        console.log(`\n📨 Event ${eventCount} received:`);
        console.log(`   ID: ${event.id}`);
        console.log(`   Kind: ${event.kind}`);
        console.log(`   Created: ${new Date(event.created_at * 1000).toISOString()}`);
        console.log(`   Pubkey: ${event.pubkey}`);
        console.log(`   Content length: ${event.content?.length || 0} chars`);
        console.log(`   Tags: ${event.tags?.length || 0} tags`);
        
        // Show first 100 chars of content
        const contentPreview = event.content?.substring(0, 100) || '';
        console.log(`   Content preview: "${contentPreview}${event.content?.length > 100 ? '...' : ''}"`);
        
        // Show first character details if content exists
        if (event.content && event.content.length > 0) {
          const firstChar = event.content[0];
          const firstCharCode = event.content.charCodeAt(0);
          console.log(`   First character: "${firstChar}" (code: ${firstCharCode})`);
        }

        // Try to parse content as JSON
        let jsonParseResult = null;
        try {
          if (event.content && event.content.trim().length > 0) {
            jsonParseResult = JSON.parse(event.content);
            parseSuccessCount++;
            console.log(`   ✅ JSON Parse: SUCCESS`);
            console.log(`   📊 Parsed object keys: ${Object.keys(jsonParseResult).join(', ')}`);
          } else {
            console.log(`   ⚠️  Empty or null content - skipping JSON parse`);
          }
        } catch (parseError) {
          parseFailureCount++;
          console.log(`   ❌ JSON Parse: FAILED - ${parseError.message}`);
          parseErrors.push({
            eventId: event.id,
            error: parseError.message,
            contentPreview: contentPreview,
            firstChar: event.content?.[0],
            firstCharCode: event.content?.charCodeAt(0)
          });
        }

        // Store sample events for analysis and show first event's tags immediately
        if (eventSamples.length < 3) {
          eventSamples.push({
            id: event.id,
            content: event.content,
            jsonParseResult,
            tags: event.tags
          });
          
          // Show detailed tag analysis for first few events
          console.log(`   🏷️  TAGS ANALYSIS:`);
          event.tags.forEach((tag, index) => {
            console.log(`      Tag ${index}: [${tag.map(t => `"${t}"`).join(', ')}]`);
          });
        }
      },
      oneose: () => {
        console.log('\n🏁 End of stored events reached');
      }
    });

    // Wait for events to be received
    await new Promise(resolve => {
      setTimeout(() => {
        sub.close();
        resolve();
      }, 10000); // Wait 10 seconds for events
    });

    // Close connections
    pool.close(RELAY_URLS);

    // Print summary
    console.log('\n📊 SUMMARY:');
    console.log(`   Total events received: ${eventCount}`);
    console.log(`   JSON parse successful: ${parseSuccessCount}`);
    console.log(`   JSON parse failed: ${parseFailureCount}`);
    console.log(`   Success rate: ${eventCount > 0 ? ((parseSuccessCount / eventCount) * 100).toFixed(1) : 0}%`);

    if (parseErrors.length > 0) {
      console.log('\n❌ PARSE ERRORS:');
      parseErrors.forEach((error, index) => {
        console.log(`   ${index + 1}. Event ${error.eventId}:`);
        console.log(`      Error: ${error.error}`);
        console.log(`      First char: "${error.firstChar}" (code: ${error.firstCharCode})`);
        console.log(`      Preview: "${error.contentPreview}"`);
      });
    }

    if (eventSamples.length > 0) {
      console.log('\n📋 SAMPLE EVENTS:');
      eventSamples.forEach((sample, index) => {
        console.log(`\n   Sample ${index + 1} (${sample.id}):`);
        console.log(`   Content: ${JSON.stringify(sample.content)}`);
        if (sample.jsonParseResult) {
          console.log(`   Parsed: ${JSON.stringify(sample.jsonParseResult, null, 4)}`);
        }
        console.log(`   Tags: ${JSON.stringify(sample.tags, null, 4)}`);
      });
    }

    if (eventCount === 0) {
      console.log('\n⚠️  No events found. This could mean:');
      console.log('   - The npub has no kind 1301 events');
      console.log('   - The relays don\'t have the events');
      console.log('   - Connection issues with the relays');
      console.log('   - The npub format is incorrect');
    }

  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

// Main execution
const npub = process.argv[2];
if (!npub) {
  console.error('Usage: node debug-nostr-events.js <npub>');
  process.exit(1);
}

debugNostrEvents(npub).catch(console.error);