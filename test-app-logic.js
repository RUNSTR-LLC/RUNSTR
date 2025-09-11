#!/usr/bin/env node

/**
 * Test App Logic - Replicates EXACT same team discovery logic as the app
 * This script contains the same validation and filtering logic as NostrTeamService
 * to verify our fixes work without import issues
 */

const { Relay } = require('nostr-tools');

class AppTeamDiscoveryTest {
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

  async discoverFitnessTeams(filters) {
    const timestamp = new Date().toISOString();
    console.log(`🟢🟢🟢 APP LOGIC TEST ACTIVE ${timestamp} 🟢🟢🟢`);
    console.log('🚀🚀🚀 TESTING APP NostrTeamService LOGIC - EXACT SAME CODE 🚀🚀🚀');
    console.log('📊 Team Discovery Starting...');
    console.log(`📡 Connecting to ${this.relayUrls.length} relays`);

    try {
      // EXACT SAME FILTER AS APP
      const nostrFilter = {
        kinds: [33404],
        limit: 200
        // NO 'since' filter - just like the app now
      };

      console.log('🐛 FILTER:', JSON.stringify(nostrFilter, null, 2));

      const teams = [];
      const processedEventIds = new Set();

      // Connect to relays - EXACT SAME LOGIC AS APP
      const relayPromises = this.relayUrls.map(async (url) => {
        try {
          console.log(`🔌 Connecting to ${url}...`);
          const relay = await Relay.connect(url);

          const sub = relay.subscribe([nostrFilter], {
            onevent: (event) => {
              // Avoid duplicates from multiple relays
              if (processedEventIds.has(event.id)) {
                return;
              }
              processedEventIds.add(event.id);

              console.log(`📥 Event ${event.id.substring(0, 8)}... from ${url}`);

              try {
                // Parse team event - EXACT SAME LOGIC
                const team = this.parseTeamEvent(event);
                
                if (!team) {
                  return;
                }
                
                // Check if team is public - EXACT SAME LOGIC
                if (!this.isTeamPublic(event)) {
                  console.log(`📝 Private team filtered: ${this.getTeamName(event)}`);
                  return;
                }
                
                // EXACT SAME VALIDATION AS APP (after our fixes)
                if (!this.isValidTeam(team)) {
                  return;
                }
                
                // Team passed all filters
                teams.push(team);
                this.discoveredTeams.set(team.id, team);
                
                console.log(`✅ Valid team discovered: ${team.name} (${team.memberCount} members)`);
                
              } catch (error) {
                console.warn(`⚠️ Error processing event ${event.id}:`, error);
              }
            },
            oneose: () => console.log(`✅ EOSE received from ${url}`),
          });

          // EXACT SAME TIMEOUT AS APP
          setTimeout(() => {
            sub.close();
            relay.close();
            console.log(`🔌 Timeout: Closed connection to ${url} after 12s`);
          }, 12000);

        } catch (error) {
          console.warn(`❌ Failed to connect to relay ${url}:`, error);
        }
      });

      // Wait for all relay connections
      await Promise.allSettled(relayPromises);
      
      // EXACT SAME WAIT TIME AS APP
      console.log('⏳ Waiting 15 seconds for comprehensive historical data collection...');
      await new Promise(resolve => setTimeout(resolve, 15000));

      console.log(`🚀🚀🚀 RESULT: Found ${teams.length} fitness teams from ${this.relayUrls.length} relays`);
      
      if (teams.length > 0) {
        console.log('📋 Teams discovered:');
        teams.forEach((team, index) => {
          console.log(`  ${index + 1}. ${team.name} (${team.memberCount} members)`);
        });
      } else {
        console.log('⚠️ No teams passed all filters');
      }
      
      return teams.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      console.error('❌ Error discovering teams:', error);
      return [];
    }
  }

  // EXACT SAME HELPER METHODS AS APP
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

      if (!teamUUID) {
        console.warn(`⚠️ Team event ${event.id} missing d-tag (UUID), skipping`);
        return null;
      }

      return {
        id: `${captain}:${teamUUID}`,
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

  // EXACT SAME VALIDATION AS APP (after our fixes)
  isValidTeam(team) {
    // Must have a name (exact match to working script)
    if (!team.name || team.name.trim() === '') {
      return false;
    }
    
    // Filter obvious test/deleted teams but be more permissive (exact match to working script)
    const name = team.name.toLowerCase();
    if (name === 'deleted' || name === 'test' || name.startsWith('test ')) {
      return false;
    }

    // Must have valid UUID (exact match to working script)
    if (!this.getTeamUUID(team.nostrEvent)) {
      return false;
    }
    
    return true;
  }
}

async function testAppLogic() {
  console.log('🧪 TESTING APP TEAM DISCOVERY LOGIC');
  console.log('=' .repeat(60));
  
  const discovery = new AppTeamDiscoveryTest();
  const teams = await discovery.discoverFitnessTeams({ limit: 50 });
  
  console.log(`\n🎯 FINAL RESULT: ${teams.length} teams found`);
  
  if (teams.length <= 3) {
    console.log('❌ STILL ONLY 3 TEAMS - The validation logic is still too restrictive');
    console.log('OR the app is using cached/stale data that needs restart');
  } else {
    console.log('✅ SUCCESS! More than 3 teams found - logic is working');
  }
  
  return teams;
}

if (require.main === module) {
  testAppLogic()
    .then(() => {
      console.log('\n🏁 Test completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Test failed:', error);
      process.exit(1);
    });
}

module.exports = { AppTeamDiscoveryTest };