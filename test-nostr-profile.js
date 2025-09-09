/**
 * Test Nostr Profile Retrieval (Kind 0 Events)
 * 
 * This script searches for kind 0 (profile metadata) events authored by the npub
 * to debug why profile info (avatar, banner, bio, lightning address) isn't showing.
 */

const { SimplePool, nip19 } = require('nostr-tools');

const RELAY_URLS = [
  'wss://relay.damus.io',
  'wss://relay.primal.net', 
  'wss://nostr.wine',
  'wss://nos.lol'
];

async function testProfileRetrieval(npub) {
  console.log('🔍 Testing Nostr profile retrieval for:', npub);
  
  // Convert npub to hex pubkey
  const decoded = nip19.decode(npub);
  const hexPubkey = decoded.data;
  console.log('🔑 Hex pubkey (author):', hexPubkey);
  
  const pool = new SimplePool();
  let totalEvents = 0;
  const profileEvents = [];
  
  console.log('\n📡 Querying relays for profile events (kind 0)...');
  console.log('Filter:', JSON.stringify({
    kinds: [0],
    authors: [hexPubkey],
    limit: 50
  }, null, 2));
  
  const results = await new Promise(resolve => {
    const sub = pool.subscribeMany(RELAY_URLS, [{
      kinds: [0], // Profile metadata events
      authors: [hexPubkey],
      limit: 50
    }], {
      onevent: (event) => {
        totalEvents++;
        profileEvents.push(event);
        
        console.log(`\n📨 Profile Event ${totalEvents}:`);
        console.log(`   ID: ${event.id.substring(0, 16)}...`);
        console.log(`   Author (pubkey): ${event.pubkey}`);
        console.log(`   Author matches query: ${event.pubkey === hexPubkey ? '✅' : '❌'}`);
        console.log(`   Created: ${new Date(event.created_at * 1000).toISOString()}`);
        console.log(`   Content length: ${event.content.length} chars`);
        console.log(`   Content preview: "${event.content.substring(0, 100)}${event.content.length > 100 ? '...' : ''}"`);
        
        // Parse profile data
        let profileData = null;
        try {
          profileData = JSON.parse(event.content);
          console.log('   ✅ Content is valid JSON');
          
          // Check for key profile fields
          console.log('   📊 Profile Fields Found:');
          console.log(`      - name: ${profileData.name ? '✅ "' + profileData.name + '"' : '❌'}`);
          console.log(`      - display_name: ${profileData.display_name ? '✅ "' + profileData.display_name + '"' : '❌'}`);
          console.log(`      - about: ${profileData.about ? '✅ "' + profileData.about.substring(0, 50) + (profileData.about.length > 50 ? '..."' : '"') : '❌'}`);
          console.log(`      - picture (avatar): ${profileData.picture ? '✅ ' + profileData.picture.substring(0, 50) + '...' : '❌'}`);
          console.log(`      - banner: ${profileData.banner ? '✅ ' + profileData.banner.substring(0, 50) + '...' : '❌'}`);
          console.log(`      - lud16 (lightning): ${profileData.lud16 ? '✅ ' + profileData.lud16 : '❌'}`);
          console.log(`      - lud06 (lightning): ${profileData.lud06 ? '✅ ' + profileData.lud06 : '❌'}`);
          console.log(`      - nip05 (verification): ${profileData.nip05 ? '✅ ' + profileData.nip05 : '❌'}`);
          
        } catch (error) {
          console.log('   ❌ Content is NOT valid JSON:', error.message);
          console.log('   Raw content:', event.content);
        }
        
        console.log(`   Tags count: ${event.tags.length}`);
        if (event.tags.length > 0) {
          console.log('   Tags:');
          event.tags.forEach((tag, i) => {
            console.log(`     ${i}: [${tag.map(t => `"${t}"`).join(', ')}]`);
          });
        }
      },
      oneose: () => {
        console.log('\n🏁 End of stored events reached');
        setTimeout(() => {
          sub.close();
          resolve({ totalEvents, profileEvents });
        }, 1000);
      }
    });
    
    // Add timeout in case no EOSE is received
    setTimeout(() => {
      console.log('\n⏰ Search timeout reached');
      sub.close();
      resolve({ totalEvents, profileEvents });
    }, 10000);
  });
  
  pool.close(RELAY_URLS);
  
  console.log('\n📊 PROFILE SEARCH RESULTS:');
  console.log(`   Total profile events found: ${totalEvents}`);
  console.log(`   All events authored by queried pubkey: ${profileEvents.every(e => e.pubkey === hexPubkey) ? '✅' : '❌'}`);
  
  if (totalEvents > 0) {
    console.log('\n🎯 SUCCESS: Found profile events authored by this npub!');
    
    // Find the most recent profile event
    const sortedEvents = profileEvents.sort((a, b) => b.created_at - a.created_at);
    const latestProfile = sortedEvents[0];
    
    console.log('\n🔬 LATEST PROFILE EVENT ANALYSIS:');
    console.log(`   Most recent profile: ${new Date(latestProfile.created_at * 1000).toISOString()}`);
    console.log(`   Event ID: ${latestProfile.id}`);
    
    try {
      const profileData = JSON.parse(latestProfile.content);
      console.log('\n📋 COMPLETE PROFILE DATA:');
      console.log('   Raw JSON:', JSON.stringify(profileData, null, 2));
      
      // Determine what might be missing for the app
      console.log('\n🔍 APP INTEGRATION CHECK:');
      console.log('   Required fields for profile display:');
      console.log(`   ✓ Avatar URL: ${profileData.picture || 'MISSING'}`);
      console.log(`   ✓ Banner URL: ${profileData.banner || 'MISSING'}`);
      console.log(`   ✓ Display Name: ${profileData.display_name || profileData.name || 'MISSING'}`);
      console.log(`   ✓ Bio/About: ${profileData.about || 'MISSING'}`);
      console.log(`   ✓ Lightning Address: ${profileData.lud16 || profileData.lud06 || 'MISSING'}`);
      
      if (profileData.picture && profileData.about) {
        console.log('\n✅ PROFILE DATA LOOKS COMPLETE - App should display profile info');
        console.log('🔧 If app still shows no profile, check app logs for parsing/display issues');
      } else {
        console.log('\n⚠️  SOME PROFILE DATA MISSING - This could explain display issues');
      }
      
    } catch (error) {
      console.log('\n❌ PROFILE DATA PARSING ERROR:', error.message);
      console.log('This explains why profile info is not showing in the app!');
    }
    
  } else {
    console.log('\n❌ NO PROFILE EVENTS FOUND');
    console.log('This could mean:');
    console.log('   - The npub has not created/updated their profile (kind 0 event)');
    console.log('   - The profile events are not stored on these relays');
    console.log('   - There might be a connection issue');
    console.log('   - The npub might be using a different profile management approach');
  }
  
  // Check if events exist from different time periods
  if (totalEvents > 1) {
    console.log('\n📈 PROFILE UPDATE HISTORY:');
    profileEvents
      .sort((a, b) => b.created_at - a.created_at)
      .slice(0, 5)
      .forEach((event, i) => {
        console.log(`   ${i + 1}. ${new Date(event.created_at * 1000).toISOString()} (${event.id.substring(0, 16)}...)`);
      });
  }
}

// Run the profile test
const npub = process.argv[2];
if (!npub) {
  console.error('Usage: node test-nostr-profile.js <npub>');
  console.error('Example: node test-nostr-profile.js npub1abc123...');
  process.exit(1);
}

testProfileRetrieval(npub).catch(console.error);