#!/usr/bin/env node

/**
 * Test ZERO filtering - Shows EVERY Kind 33404 event with no restrictions
 */

const { Relay } = require('nostr-tools');

class ZeroFilteringTest {
  constructor() {
    this.discoveredTeams = new Map();
    this.relayUrls = [
      'wss://relay.damus.io',
      'wss://relay.primal.net',
      'wss://nostr.wine',
      'wss://nos.lol',
      'wss://relay.nostr.band',
      'wss://relay.snort.social',
      'wss://nostr-pub.wellorder.net',
      'wss://relay.nostrich.de',
      'wss://nostr.oxtr.dev',
    ];
  }

  async discoverAllTeams() {
    console.log('🔥🔥🔥 ZERO FILTERING TEST - SHOW EVERYTHING 🔥🔥🔥');
    console.log('📊 Finding ALL Kind 33404 events with NO restrictions...');
    console.log(`📡 Connecting to ${this.relayUrls.length} relays`);

    try {
      const nostrFilter = {
        kinds: [33404],
        limit: 200
      };

      console.log('🐛 FILTER:', JSON.stringify(nostrFilter, null, 2));

      const teams = [];
      const processedEventIds = new Set();

      const relayPromises = this.relayUrls.map(async (url) => {
        try {
          console.log(`🔌 Connecting to ${url}...`);
          const relay = await Relay.connect(url);

          const sub = relay.subscribe([nostrFilter], {
            onevent: (event) => {
              if (processedEventIds.has(event.id)) {
                return;
              }
              processedEventIds.add(event.id);

              console.log(`📥 Event ${event.id.substring(0, 8)}... from ${url}`);

              try {
                const team = this.parseTeamEvent(event);
                
                if (!team) {
                  console.log(`⚠️ Could not parse event ${event.id.substring(0, 8)}`);
                  return;
                }
                
                // NO FILTERING AT ALL - ADD EVERYTHING
                teams.push(team);
                this.discoveredTeams.set(team.id, team);
                
                console.log(`✅ Added team: ${team.name} (public: ${team.isPublic})`);
                
              } catch (error) {
                console.warn(`⚠️ Error processing event ${event.id}:`, error.message);
              }
            },
            oneose: () => console.log(`✅ EOSE received from ${url}`),
          });

          setTimeout(() => {
            sub.close();
            relay.close();
            console.log(`🔌 Closed connection to ${url} after 12s`);
          }, 12000);

        } catch (error) {
          console.warn(`❌ Failed to connect to relay ${url}:`, error);
        }
      });

      await Promise.allSettled(relayPromises);
      
      console.log('⏳ Waiting 15 seconds for comprehensive data collection...');
      await new Promise(resolve => setTimeout(resolve, 15000));

      console.log(`🔥🔥🔥 ZERO FILTERING RESULT: Found ${teams.length} total events`);
      
      if (teams.length > 0) {
        console.log('📋 ALL events found:');
        teams.forEach((team, index) => {
          const publicStatus = team.isPublic ? '🌍 PUBLIC' : '🔒 PRIVATE';
          console.log(`  ${index + 1}. ${team.name} (${team.memberCount} members) ${publicStatus}`);
        });
      } else {
        console.log('⚠️ No events found at all');
      }
      
      return teams;
    } catch (error) {
      console.error('❌ Error in zero filtering test:', error);
      return [];
    }
  }

  parseTeamEvent(event) {
    try {
      const name = this.getTeamName(event);
      const captain = this.getTeamCaptain(event);
      const teamUUID = this.getTeamUUID(event);
      const isPublic = this.isTeamPublic(event);

      const tags = new Map(event.tags.map((tag) => [tag[0], tag.slice(1)]));
      const location = tags.get('location')?.[0];

      const memberTags = event.tags.filter((tag) => tag[0] === 'member');
      const memberCount = memberTags.length + 1;

      const activityTags = event.tags.filter((tag) => tag[0] === 't');
      const activityTypes = activityTags.map((tag) => tag[1]).filter(Boolean);

      // Use event.id as fallback for UUID
      const id = `${captain}:${teamUUID || event.id}`;

      return {
        id,
        name,
        description: event.content || '',
        captainId: captain,
        captainNpub: captain,
        memberCount,
        activityType: activityTypes.join(', ') || 'fitness',
        location,
        isPublic,
        createdAt: event.created_at,
        tags: activityTypes,
        nostrEvent: event,
      };
    } catch (error) {
      console.error('❌ Failed to parse team event:', error);
      return null;
    }
  }

  // Helper methods (unchanged)
  isTeamPublic(event) {
    const publicTag = event.tags.find((tag) => tag[0] === 'public');
    return publicTag ? publicTag[1]?.toLowerCase() === 'true' : false;
  }

  getTeamUUID(event) {
    const dTag = event.tags.find((tag) => tag[0] === 'd');
    return dTag ? dTag[1] : undefined;
  }

  getTeamName(event) {
    const nameTag = event.tags.find((tag) => tag[0] === 'name');
    return nameTag ? nameTag[1] : 'Unnamed Team';
  }

  getTeamCaptain(event) {
    const captainTag = event.tags.find((tag) => tag[0] === 'captain');
    return captainTag ? captainTag[1] : event.pubkey;
  }
}

async function testZeroFiltering() {
  console.log('🧪 TESTING ZERO FILTERING APPROACH');
  console.log('=' .repeat(60));
  
  const test = new ZeroFilteringTest();
  const teams = await test.discoverAllTeams();
  
  console.log(`\n🎯 FINAL RESULT: ${teams.length} total Kind 33404 events`);
  
  const publicTeams = teams.filter(t => t.isPublic);
  const privateTeams = teams.filter(t => !t.isPublic);
  
  console.log(`🌍 Public teams: ${publicTeams.length}`);
  console.log(`🔒 Private teams: ${privateTeams.length}`);
  
  if (teams.length > 10) {
    console.log('✅ SUCCESS! Found many more events - zero filtering works');
  } else {
    console.log('⚠️ Still not finding many events - may be a deeper issue');
  }
  
  return teams;
}

if (require.main === module) {
  testZeroFiltering()
    .then(() => {
      console.log('\n🏁 Zero filtering test completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Test failed:', error);
      process.exit(1);
    });
}