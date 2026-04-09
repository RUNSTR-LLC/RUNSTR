/**
 * Diagnostic Script: Fetch Captain Profiles (Simple WebSocket Version)
 *
 * Fetches kind 0 profile events for team captains using direct WebSocket connections
 * and extracts their Lightning addresses (lud16 field).
 */

import WebSocket from 'ws';

// Team captain data
const TEAM_CAPTAINS = [
  { name: 'RUNSTR', hex: '30ceb64e73197a05958c8bd92ab079c815bb44fbfbb3eb5d9766c5207f08bdf5' },
  { name: 'LATAM Corre', hex: '9358c67695d9e78bde2bf3ce1eb0a5059553687632a177e7d25deeff9f2912fc' },
  { name: 'Bitcoin Runners', hex: 'dfc110da980d0d449ded3df4e093d4d636411b07603dbbc93af8d364575868d0' },
  { name: 'BULLISH', hex: 'd151af47460c3097432110aec0b4a696d2dd455b35dc1626cacf54191a2be219' },
  { name: 'Ohio Ruckers', hex: '1c197b12ca9ce0415b70e7405b9770f0ec6bccfb59b32b63aafd42cb242e1642' },
  { name: 'Pleb Walkstr', hex: 'df478568479de26b4a83c1bdc4dbab61b5cc82e1a312e2b28bc815a12a951e67' },
  { name: 'CYCLESTR', hex: '623ed218de81311783656783d6ce690b521a89c4dc09f28962e5bfd4fa549249' },
  { name: 'Family Walks & Hikes', hex: '725ea5ae7b0276cdea2956382459c3dfa88fadc738a9cb8ee267e28e8472554e' },
  { name: 'Ruckstr', hex: '9bd91682b27912f6713aaac36136f720b0e5454c84a4bc4f3933bf0e8c7b902d' },
  { name: 'Spain scape', hex: '00000000507f1a27b43d2c47da2ee826378dba007501d66691fada36fa931856' },
];

// Try multiple relays (use the fastest one)
const RELAYS = [
  'wss://relay.damus.io',
  'wss://relay.primal.net',
  'wss://nos.lol',
  'wss://relay.nostr.band',
];

interface NostrEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

interface ProfileMetadata {
  name?: string;
  display_name?: string;
  about?: string;
  picture?: string;
  lud16?: string;
  lud06?: string;
}

async function queryRelay(relayUrl: string, filter: any): Promise<NostrEvent[]> {
  return new Promise((resolve, reject) => {
    const events: NostrEvent[] = [];
    const ws = new WebSocket(relayUrl);
    const subscriptionId = Math.random().toString(36).slice(2);
    let timeout: NodeJS.Timeout;
    let resolved = false;

    const finish = () => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeout);
      try {
        ws.close();
      } catch (e) {
        // Ignore close errors
      }
      resolve(events);
    };

    // Absolute timeout - close no matter what after 3 seconds
    timeout = setTimeout(() => {
      finish();
    }, 3000);

    ws.on('open', () => {
      // Send REQ message
      const req = ['REQ', subscriptionId, filter];
      ws.send(JSON.stringify(req));
    });

    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        const [type, subId, event] = message;

        if (type === 'EVENT' && subId === subscriptionId) {
          events.push(event as NostrEvent);
        } else if (type === 'EOSE' && subId === subscriptionId) {
          // End of stored events - close connection
          finish();
        }
      } catch (e) {
        // Ignore parse errors
      }
    });

    ws.on('error', (error) => {
      finish();
    });

    ws.on('close', () => {
      finish();
    });
  });
}

async function fetchCaptainProfiles() {
  console.log('🔌 Fetching profiles from Nostr relays...\n');

  const filter = {
    kinds: [0],
    authors: TEAM_CAPTAINS.map(c => c.hex),
  };

  // Try all relays and collect events
  const allEvents: NostrEvent[] = [];

  for (const relay of RELAYS) {
    console.log(`📡 Querying ${relay}...`);
    try {
      const events = await queryRelay(relay, filter);
      console.log(`   ✅ Got ${events.length} events`);
      allEvents.push(...events);
    } catch (error) {
      console.log(`   ❌ Failed: ${error}`);
    }
  }

  console.log(`\n📥 Total events received: ${allEvents.length}\n`);

  // Deduplicate - keep only latest event per pubkey
  const profilesByPubkey = new Map<string, NostrEvent>();
  for (const event of allEvents) {
    const existing = profilesByPubkey.get(event.pubkey);
    if (!existing || event.created_at > existing.created_at) {
      profilesByPubkey.set(event.pubkey, event);
    }
  }

  // Process and display results
  console.log('═══════════════════════════════════════════════════════════════════════════════');
  console.log('TEAM CAPTAIN LIGHTNING ADDRESSES');
  console.log('═══════════════════════════════════════════════════════════════════════════════\n');

  const results: Array<{
    team: string;
    npub: string;
    lud16: string;
    displayName?: string;
  }> = [];

  for (const captain of TEAM_CAPTAINS) {
    const event = profilesByPubkey.get(captain.hex);

    if (!event) {
      results.push({
        team: captain.name,
        npub: hexToNpub(captain.hex),
        lud16: '❌ NO PROFILE FOUND',
      });
      continue;
    }

    try {
      const metadata: ProfileMetadata = JSON.parse(event.content);
      const lightningAddress = metadata.lud16 || metadata.lud06 || '';

      results.push({
        team: captain.name,
        npub: hexToNpub(captain.hex),
        lud16: lightningAddress || '⚠️  NONE IN PROFILE',
        displayName: metadata.display_name || metadata.name,
      });
    } catch (error) {
      results.push({
        team: captain.name,
        npub: hexToNpub(captain.hex),
        lud16: '❌ PARSE ERROR',
      });
    }
  }

  // Print formatted table
  const maxTeamLen = Math.max(...results.map(r => r.team.length));

  console.log('Team'.padEnd(maxTeamLen + 2), '| Lightning Address');
  console.log('─'.repeat(maxTeamLen + 2), '+', '─'.repeat(60));

  for (const result of results) {
    const teamCol = result.team.padEnd(maxTeamLen + 2);
    console.log(`${teamCol} | ${result.lud16}`);
    if (result.displayName) {
      console.log(`${''.padEnd(maxTeamLen + 2)} | Display Name: ${result.displayName}`);
    }
    console.log();
  }

  console.log('═══════════════════════════════════════════════════════════════════════════════');

  // Summary statistics
  const withLightning = results.filter(r => r.lud16 && !r.lud16.startsWith('❌') && !r.lud16.startsWith('⚠️')).length;
  const noProfile = results.filter(r => r.lud16.startsWith('❌ NO PROFILE')).length;
  const noLightning = results.filter(r => r.lud16.startsWith('⚠️')).length;

  console.log('\n📊 SUMMARY:');
  console.log(`   ✅ Captains with Lightning address: ${withLightning}/${TEAM_CAPTAINS.length}`);
  console.log(`   ⚠️  Captains with no Lightning address: ${noLightning}/${TEAM_CAPTAINS.length}`);
  console.log(`   ❌ Captains with no profile: ${noProfile}/${TEAM_CAPTAINS.length}`);
}

// Helper: Convert hex pubkey to abbreviated npub
function hexToNpub(hex: string): string {
  return `npub1${hex.slice(0, 16)}...${hex.slice(-8)}`;
}

// Run the script
fetchCaptainProfiles()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
