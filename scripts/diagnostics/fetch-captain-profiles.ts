/**
 * Diagnostic Script: Fetch Captain Profiles
 *
 * Fetches kind 0 profile events for team captains from Nostr relays
 * and extracts their Lightning addresses (lud16 field).
 */

import NDK, { NDKEvent, NDKFilter } from '@nostr-dev-kit/ndk';
import WebSocket from 'ws';

// Polyfill WebSocket for Node.js
(global as any).WebSocket = WebSocket;

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

// Relay configuration
const RELAYS = [
  'wss://relay.damus.io',
  'wss://relay.primal.net',
  'wss://nos.lol',
  'wss://relay.nostr.band',
];

interface ProfileMetadata {
  name?: string;
  display_name?: string;
  about?: string;
  picture?: string;
  lud16?: string;
  lud06?: string;
}

async function fetchCaptainProfiles() {
  console.log('🔌 Initializing NDK with relays...\n');

  // Create standalone NDK instance (Node.js environment)
  const ndk = new NDK({
    explicitRelayUrls: RELAYS,
  });

  try {
    // Don't wait for explicit connect - let fetchEvents handle it
    console.log('📡 Fetching kind 0 profile events (NDK will connect automatically)...\n');

    // Fetch kind 0 events for all captains
    const filter: NDKFilter = {
      kinds: [0],
      authors: TEAM_CAPTAINS.map(c => c.hex),
    };

    // fetchEvents will connect automatically and return results
    const fetchPromise = ndk.fetchEvents(filter);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Fetch timeout after 15s')), 15000)
    );

    const events = await Promise.race([fetchPromise, timeoutPromise]);
    console.log(`📥 Received ${events.size} profile events\n`);

    // Map events by pubkey (keep only latest event per author)
    const profilesByPubkey = new Map<string, NDKEvent>();
    for (const event of events) {
      const existing = profilesByPubkey.get(event.pubkey);
      if (!existing || event.created_at! > existing.created_at!) {
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
    const maxNpubLen = Math.max(...results.map(r => r.npub.length));

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

  } catch (error) {
    console.error('❌ Error fetching profiles:', error);
    throw error;
  } finally {
    // Cleanup - close NDK connections
    for (const relay of ndk.pool.relays.values()) {
      relay.disconnect();
    }
  }
}

// Helper: Convert hex pubkey to npub (using NDK)
function hexToNpub(hex: string): string {
  // NDK doesn't expose nip19 encoding directly in the same way
  // We'll use a simple npub format for display
  // In a real implementation, you'd use NDK's built-in methods or nip19 utilities
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
