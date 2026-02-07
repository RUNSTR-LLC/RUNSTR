/**
 * Analyze Kind 0 Profile Data
 *
 * This script fetches the logged-in user's kind 0 event from multiple relays
 * and displays the raw content to diagnose banner/avatar storage issues.
 *
 * Usage: npx ts-node scripts/diagnostics/analyze-profile-kind0.ts
 */

import NDK, { NDKEvent } from '@nostr-dev-kit/ndk';
import { nip19 } from 'nostr-tools';
import * as fs from 'fs';
import * as path from 'path';

// Relays to check
const RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.primal.net',
  'wss://relay.nostr.band',
];

async function getStoredPubkey(): Promise<string | null> {
  // Try to read from a local config file if it exists
  const configPath = path.join(__dirname, 'profile-debug-config.json');
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    return config.hexPubkey || config.npub || null;
  }
  return null;
}

function npubToHex(npubOrHex: string): string {
  if (npubOrHex.startsWith('npub1')) {
    const decoded = nip19.decode(npubOrHex);
    if (decoded.type === 'npub') {
      return decoded.data;
    }
  }
  return npubOrHex; // Already hex
}

async function analyzeProfile(pubkey: string) {
  console.log('\n' + '='.repeat(80));
  console.log('KIND 0 PROFILE ANALYSIS');
  console.log('='.repeat(80));
  console.log(`\nPubkey: ${pubkey}`);
  console.log(`Npub: ${nip19.npubEncode(pubkey)}`);
  console.log('\n');

  const ndk = new NDK({
    explicitRelayUrls: RELAYS,
  });

  console.log('Connecting to relays...');
  await ndk.connect();

  // Wait for connections
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('\nFetching kind 0 events from all relays...\n');

  const filter = {
    kinds: [0],
    authors: [pubkey],
  };

  const events: NDKEvent[] = [];
  const subscription = ndk.subscribe(filter, { closeOnEose: false });

  subscription.on('event', (event: NDKEvent) => {
    events.push(event);
  });

  // Wait for events
  await new Promise(resolve => setTimeout(resolve, 3000));
  subscription.stop();

  if (events.length === 0) {
    console.log('❌ No kind 0 events found for this pubkey!');
    console.log('   This user may not have a profile published.');
    process.exit(1);
  }

  // Sort by created_at to get most recent first
  events.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));

  console.log(`Found ${events.length} kind 0 event(s)\n`);

  // Analyze each event
  for (let i = 0; i < Math.min(events.length, 3); i++) {
    const event = events[i];
    console.log('-'.repeat(80));
    console.log(`EVENT #${i + 1} (${i === 0 ? 'MOST RECENT' : 'older'})`);
    console.log('-'.repeat(80));

    console.log(`\nEvent ID: ${event.id}`);
    console.log(`Created: ${new Date((event.created_at || 0) * 1000).toISOString()}`);
    console.log(`Relay: ${event.relay?.url || 'unknown'}`);

    // Parse content
    try {
      const content = JSON.parse(event.content);

      console.log('\n📋 CONTENT FIELDS:');
      console.log('-'.repeat(40));

      // List all keys
      const keys = Object.keys(content);
      console.log(`Total fields: ${keys.length}`);
      console.log(`Fields present: ${keys.join(', ')}`);

      console.log('\n📊 FIELD VALUES:');
      console.log('-'.repeat(40));

      // Display each field
      for (const key of keys) {
        const value = content[key];
        const displayValue = typeof value === 'string'
          ? (value.length > 100 ? value.substring(0, 100) + '...' : value)
          : JSON.stringify(value);
        console.log(`  ${key}: ${displayValue}`);
      }

      // Specific checks for common issues
      console.log('\n🔍 BANNER/AVATAR ANALYSIS:');
      console.log('-'.repeat(40));

      // Check banner variations
      const bannerFields = ['banner', 'background', 'cover', 'header', 'banner_url'];
      for (const field of bannerFields) {
        if (content[field]) {
          console.log(`  ✅ ${field}: ${content[field].substring(0, 80)}...`);
        }
      }
      if (!bannerFields.some(f => content[f])) {
        console.log('  ❌ No banner field found (checked: banner, background, cover, header, banner_url)');
      }

      // Check picture/avatar variations
      const pictureFields = ['picture', 'avatar', 'image', 'photo', 'profile_image'];
      for (const field of pictureFields) {
        if (content[field]) {
          console.log(`  ✅ ${field}: ${content[field].substring(0, 80)}...`);
        }
      }
      if (!pictureFields.some(f => content[f])) {
        console.log('  ❌ No picture field found (checked: picture, avatar, image, photo, profile_image)');
      }

      // Check Lightning address
      const lnFields = ['lud16', 'lud06', 'lightning', 'ln_address'];
      for (const field of lnFields) {
        if (content[field]) {
          console.log(`  ✅ ${field}: ${content[field]}`);
        }
      }

      console.log('\n📝 RAW CONTENT (for verification):');
      console.log('-'.repeat(40));
      console.log(JSON.stringify(content, null, 2));

    } catch (error) {
      console.log('❌ Failed to parse content as JSON:');
      console.log(event.content);
    }

    console.log('\n');
  }

  // Summary
  console.log('='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));

  const latestContent = JSON.parse(events[0].content);
  console.log(`\nMost recent profile (${new Date((events[0].created_at || 0) * 1000).toISOString()}):`);
  console.log(`  Name: ${latestContent.name || latestContent.display_name || '(not set)'}`);
  console.log(`  Picture: ${latestContent.picture ? '✅ Yes' : '❌ No'}`);
  console.log(`  Banner: ${latestContent.banner ? '✅ Yes' : '❌ No'}`);
  console.log(`  Lightning: ${latestContent.lud16 || latestContent.lud06 || '(not set)'}`);
  console.log(`  NIP-05: ${latestContent.nip05 || '(not set)'}`);

  if (!latestContent.banner) {
    console.log('\n⚠️  BANNER NOT FOUND IN KIND 0 EVENT');
    console.log('   The banner must be set in your Nostr profile using a client like:');
    console.log('   - Damus (iOS)');
    console.log('   - Amethyst (Android)');
    console.log('   - Primal (web)');
    console.log('   - Nostrudel (web)');
  }

  process.exit(0);
}

// Main execution
async function main() {
  // Check for command line argument
  const pubkeyArg = process.argv[2];

  if (pubkeyArg) {
    const hexPubkey = npubToHex(pubkeyArg);
    await analyzeProfile(hexPubkey);
  } else {
    // Try to read from config
    const storedPubkey = await getStoredPubkey();

    if (storedPubkey) {
      const hexPubkey = npubToHex(storedPubkey);
      await analyzeProfile(hexPubkey);
    } else {
      console.log('Usage: npx ts-node scripts/diagnostics/analyze-profile-kind0.ts <npub or hex pubkey>');
      console.log('\nExample:');
      console.log('  npx ts-node scripts/diagnostics/analyze-profile-kind0.ts npub1abc123...');
      console.log('  npx ts-node scripts/diagnostics/analyze-profile-kind0.ts abc123def456...');
      console.log('\nOr create a config file at scripts/diagnostics/profile-debug-config.json:');
      console.log('  { "hexPubkey": "your-hex-pubkey-here" }');
      process.exit(1);
    }
  }
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
