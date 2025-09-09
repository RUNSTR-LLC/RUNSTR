/**
 * Test the app's NostrProfileService directly
 * This will show us if the issue is in the service logic or elsewhere
 */

const { SimplePool, nip19 } = require('nostr-tools');

// Mock React Native AsyncStorage since we're in Node.js
global.AsyncStorage = {
  getItem: async () => null,
  setItem: async () => {},
  removeItem: async () => {},
  clear: async () => {},
  getAllKeys: async () => [],
  multiGet: async () => [],
  multiSet: async () => {},
  multiRemove: async () => {}
};

// Mock console methods to capture service logs
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.log = (...args) => {
  originalConsoleLog('[APP-LOG]', ...args);
};

console.error = (...args) => {
  originalConsoleError('[APP-ERROR]', ...args);
};

console.warn = (...args) => {
  originalConsoleWarn('[APP-WARN]', ...args);
};

async function testAppProfileService(npub) {
  console.log('🧪 Testing App NostrProfileService...\n');
  
  try {
    // We need to simulate the app's environment
    // But first let's create a simplified version that matches the app's logic
    
    const decoded = nip19.decode(npub);
    const hexPubkey = decoded.data;
    
    console.log('Input npub:', npub);
    console.log('Converted hex pubkey:', hexPubkey);
    
    // Test the profile filter that the app uses
    const profileFilter = {
      authors: [hexPubkey],
      kinds: [0],
      limit: 1  // This is the issue - app only requests 1 event!
    };
    
    console.log('\nProfile filter used by app:');
    console.log(JSON.stringify(profileFilter, null, 2));
    
    const RELAY_URLS = [
      'wss://relay.damus.io',
      'wss://relay.primal.net', 
      'wss://nostr.wine',
      'wss://nos.lol'
    ];
    
    const pool = new SimplePool();
    const events = [];
    
    console.log('\n📡 Testing with app\'s profile filter (limit: 1)...');
    
    const results = await new Promise(resolve => {
      const sub = pool.subscribeMany(RELAY_URLS, [profileFilter], {
        onevent: (event) => {
          events.push(event);
          console.log(`Found profile event: ${event.id.substring(0, 16)}...`);
          console.log(`Created at: ${new Date(event.created_at * 1000).toISOString()}`);
          console.log(`Content preview: "${event.content.substring(0, 50)}..."`);
          
          try {
            const parsed = JSON.parse(event.content);
            console.log(`Display name: ${parsed.display_name || parsed.displayName || parsed.name || 'N/A'}`);
          } catch (error) {
            console.log('Failed to parse content as JSON');
          }
        },
        oneose: () => {
          setTimeout(() => {
            sub.close();
            resolve(events);
          }, 1000);
        }
      });
      
      setTimeout(() => {
        sub.close();
        resolve(events);
      }, 5000);
    });
    
    pool.close(RELAY_URLS);
    
    console.log(`\n📊 RESULTS with limit: 1`);
    console.log(`Events found: ${events.length}`);
    
    if (events.length > 0) {
      const event = events[0];
      console.log('\n🔍 App would use this event:');
      console.log(`Event ID: ${event.id}`);
      console.log(`Created: ${new Date(event.created_at * 1000).toISOString()}`);
      console.log(`Content: ${event.content}`);
      
      try {
        const profileData = JSON.parse(event.content);
        console.log('\n📋 Parsed profile data:');
        console.log(`- Display Name: ${profileData.display_name || profileData.displayName || 'N/A'}`);
        console.log(`- Avatar: ${profileData.picture || 'N/A'}`);
        console.log(`- Banner: ${profileData.banner || 'N/A'}`);
        console.log(`- Bio: ${profileData.about || 'N/A'}`);
        console.log(`- Lightning: ${profileData.lud16 || profileData.lud06 || 'N/A'}`);
        
        if (profileData.display_name && profileData.picture) {
          console.log('\n✅ Profile data looks complete for app display');
        } else {
          console.log('\n⚠️  Some fields missing - this could explain display issues');
        }
        
      } catch (error) {
        console.log('\n❌ JSON parsing failed:', error.message);
      }
    } else {
      console.log('\n❌ No profile events found with app filter');
    }
    
    // Now test with higher limit to see if we're missing newer events
    console.log('\n🔄 Testing with higher limit to compare...');
    
    const pool2 = new SimplePool();
    const allEvents = [];
    
    const results2 = await new Promise(resolve => {
      const sub = pool2.subscribeMany(RELAY_URLS, [{
        authors: [hexPubkey],
        kinds: [0],
        limit: 10  // Higher limit
      }], {
        onevent: (event) => {
          allEvents.push(event);
        },
        oneose: () => {
          setTimeout(() => {
            sub.close();
            resolve(allEvents);
          }, 1000);
        }
      });
      
      setTimeout(() => {
        sub.close();
        resolve(allEvents);
      }, 5000);
    });
    
    pool2.close(RELAY_URLS);
    
    if (allEvents.length > 1) {
      allEvents.sort((a, b) => b.created_at - a.created_at);
      
      console.log(`\n📊 Found ${allEvents.length} total profile events:`);
      allEvents.forEach((event, i) => {
        console.log(`  ${i + 1}. ${new Date(event.created_at * 1000).toISOString()} (${event.id.substring(0, 16)}...)`);
      });
      
      const latest = allEvents[0];
      const appWouldGet = events[0];
      
      if (latest.id !== appWouldGet?.id) {
        console.log('\n🚨 ISSUE FOUND:');
        console.log('App got:', appWouldGet ? new Date(appWouldGet.created_at * 1000).toISOString() : 'none');
        console.log('Latest is:', new Date(latest.created_at * 1000).toISOString());
        console.log('\n💡 SOLUTION: App filter limit=1 is getting random event, not latest!');
      }
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
const npub = process.argv[2];
if (!npub) {
  console.error('Usage: node test-app-profile-service.js <npub>');
  process.exit(1);
}

testAppProfileService(npub).catch(console.error);