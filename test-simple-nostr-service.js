/**
 * Test SimpleNostrService - Verify it finds teams like Phase 2 approach
 * This tests our React Native WebSocket workarounds outside of React Native
 */

const { SimplePool } = require('nostr-tools');

// Test the core strategy that SimpleNostrService uses
async function testSimplePoolStrategy() {
  console.log('🚀 Testing SimplePool multi-time-range strategy...');
  
  const pool = new SimplePool();
  const relayUrls = [
    'wss://relay.damus.io',
    'wss://nos.lol', 
    'wss://relay.primal.net',
    'wss://nostr.wine'
  ];

  const now = Math.floor(Date.now() / 1000);
  const day = 24 * 60 * 60;
  
  // Test the same time ranges as SimpleNostrService
  const timeRanges = [
    { name: 'Recent (0-7 days)', since: now - (7 * day), until: now, limit: 50 },
    { name: 'Future Events (2025)', since: now, until: now + (6 * 30 * day), limit: 50 }, // Key for future-dated teams
    { name: 'Deep Historical', since: 0, until: now - (90 * day), limit: 50 }
  ];

  let totalEventsFound = 0;
  const allEvents = [];
  const processedEventIds = new Set();

  for (const timeRange of timeRanges) {
    console.log(`🕒 Testing ${timeRange.name}...`);
    
    const filter = {
      kinds: [33404],
      limit: timeRange.limit,
      since: timeRange.since,
      until: timeRange.until
    };

    const rangeEvents = await new Promise((resolve) => {
      const events = [];
      const timeout = 10000; // 10 second timeout
      
      const sub = pool.subscribeMany(
        relayUrls,
        [filter],
        {
          onevent: (event) => {
            events.push(event);
            console.log(`📥 Event ${events.length}: ${event.id?.slice(0, 8)} (${timeRange.name})`);
          },
          oneose: () => {
            // Don't close - this is the React Native fix!
            console.log(`📨 EOSE received for ${timeRange.name} - but continuing to wait...`);
          }
        }
      );

      // Wait full timeout regardless of EOSE (Phase 2 proven approach)
      setTimeout(() => {
        console.log(`⏰ ${timeRange.name} timeout complete: ${events.length} events collected`);
        sub.close();
        resolve(events);
      }, timeout);
    });

    // Add unique events
    for (const event of rangeEvents) {
      if (!processedEventIds.has(event.id)) {
        allEvents.push(event);
        processedEventIds.add(event.id);
        totalEventsFound++;
      }
    }

    console.log(`   ${timeRange.name}: ${rangeEvents.length} events (${totalEventsFound} total unique)`);
    
    // Delay between ranges
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  // Nuclear strategy test
  console.log('🚀 Testing nuclear strategy (no time filters)...');
  
  const nuclearEvents = await new Promise((resolve) => {
    const events = [];
    const timeout = 10000;
    
    const sub = pool.subscribeMany(
      relayUrls,
      [{ kinds: [33404], limit: 100 }], // No time filters
      {
        onevent: (event) => {
          events.push(event);
          console.log(`📥 Nuclear Event ${events.length}: ${event.id?.slice(0, 8)}`);
        },
        oneose: () => {
          console.log(`📨 Nuclear EOSE received - but continuing to wait...`);
        }
      }
    );

    setTimeout(() => {
      console.log(`⏰ Nuclear timeout complete: ${events.length} events collected`);
      sub.close();
      resolve(events);
    }, timeout);
  });

  // Add unique nuclear events
  for (const event of nuclearEvents) {
    if (!processedEventIds.has(event.id)) {
      allEvents.push(event);
      processedEventIds.add(event.id);
      totalEventsFound++;
    }
  }

  console.log(`🚀 Nuclear strategy found ${nuclearEvents.length} events (${totalEventsFound} total unique)`);

  // Parse teams
  const teams = [];
  for (const event of allEvents) {
    try {
      const tags = new Map(event.tags.map((tag) => [tag[0], tag.slice(1)]));
      
      const name = tags.get('name')?.[0] || 'Unnamed Team';
      const isPublic = tags.get('public')?.[0]?.toLowerCase() === 'true';
      
      if (!isPublic) continue;
      if (!name || name.trim() === '') continue;
      if (name.toLowerCase() === 'deleted' || name.toLowerCase() === 'test') continue;

      const memberTags = event.tags.filter((tag) => tag[0] === 'member');
      const memberCount = memberTags.length + 1;

      teams.push({
        name,
        memberCount,
        createdAt: event.created_at,
        id: event.id.slice(0, 8)
      });

    } catch (error) {
      console.warn(`Error parsing event ${event.id}:`, error);
    }
  }

  console.log(`\n🎯 RESULTS:`);
  console.log(`   Total Events Found: ${totalEventsFound}`);
  console.log(`   Teams Discovered: ${teams.length}`);
  
  if (teams.length > 0) {
    console.log('\n📋 Teams found:');
    teams.forEach((team, index) => {
      console.log(`  ${index + 1}. ${team.name} (${team.memberCount} members) [${team.id}]`);
    });
  }

  // Check for key teams we should find
  const keyTeams = ['RUNSTR', 'Pleb Walkstr', 'LATAM Corre', 'Ohio Ruckers', 'Spain scape'];
  const foundKeyTeams = keyTeams.filter(keyTeam => 
    teams.some(team => team.name.includes(keyTeam))
  );

  console.log(`\n🔍 Key Team Analysis:`);
  console.log(`   Looking for: ${keyTeams.join(', ')}`);
  console.log(`   Found: ${foundKeyTeams.join(', ')}`);
  console.log(`   Success Rate: ${foundKeyTeams.length}/${keyTeams.length} (${Math.round(foundKeyTeams.length/keyTeams.length*100)}%)`);

  pool.close(relayUrls);
  
  return {
    totalEvents: totalEventsFound,
    teamsFound: teams.length,
    keyTeamsFound: foundKeyTeams.length,
    teams
  };
}

// Run test
testSimplePoolStrategy()
  .then(result => {
    console.log(`\n✅ Test Complete: ${result.teamsFound} teams found with ${result.totalEvents} events`);
    console.log(`🎯 Phase 2 Target Check: ${result.keyTeamsFound >= 3 ? 'PASS' : 'NEEDS WORK'} (found ${result.keyTeamsFound}/5 key teams)`);
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });