#!/usr/bin/env tsx
/**
 * Diagnostic Script: Analyze Recent Kind 1301 Workout Event
 *
 * Purpose: Verify that published workout events have all required data for leaderboards
 *
 * Checks:
 * - Team tag presence and correctness
 * - Split tag format and count
 * - Distance tag
 * - Activity type tag
 * - Calculates expected leaderboards based on split count
 */

import NDK, { NDKEvent, NDKFilter } from '@nostr-dev-kit/ndk';
import { nip19 } from 'nostr-tools';

// RUNSTR Team ID
const RUNSTR_TEAM_ID = '87d30c8b-aa18-4424-a629-d41ea7f89078';

// User's npub
const USER_NPUB = 'npub1xr8tvnnnr9aqt9vv30vj4vreeq2mk38mlwe7khvhvmzjqlcghh6sr85uum';

// Nostr relays
const RELAYS = [
  'wss://relay.damus.io',
  'wss://relay.primal.net',
  'wss://nos.lol',
  'wss://relay.nostr.band',
];

interface SplitData {
  km: number;
  time: string;
  seconds: number;
}

function parseTimeToSeconds(timeStr: string): number {
  const parts = timeStr.split(':');
  if (parts.length === 3) {
    const [hours, mins, secs] = parts.map(Number);
    return hours * 3600 + mins * 60 + secs;
  } else if (parts.length === 2) {
    const [mins, secs] = parts.map(Number);
    return mins * 60 + secs;
  }
  return 0;
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

async function main() {
  console.log('🔍 RUNSTR Workout Diagnostic Tool\n');
  console.log('================================================\n');

  // Decode npub to hex
  const decoded = nip19.decode(USER_NPUB);
  const userPubkey = decoded.data as string;
  console.log(`👤 User: ${USER_NPUB}`);
  console.log(`   Hex: ${userPubkey}\n`);

  // Initialize NDK
  console.log('🌐 Connecting to Nostr relays...');
  const ndk = new NDK({
    explicitRelayUrls: RELAYS,
  });

  await ndk.connect();
  console.log(`   ✅ Connected to ${ndk.pool.connectedRelays().length} relays\n`);

  // Query for recent kind 1301 events
  const oneDayAgo = Math.floor(Date.now() / 1000) - 86400;

  const filter: NDKFilter = {
    kinds: [1301],
    authors: [userPubkey],
    since: oneDayAgo,
    limit: 10,
  };

  console.log('📥 Fetching recent workout events (kind 1301)...');
  console.log(`   Time range: Last 24 hours\n`);

  const events = await ndk.fetchEvents(filter);
  const eventsArray = Array.from(events);

  if (eventsArray.length === 0) {
    console.log('❌ No kind 1301 events found in the last 24 hours!');
    console.log('\n💡 Troubleshooting:');
    console.log('   - Did you publish the workout using kind 1301?');
    console.log('   - Was it published in the last 24 hours?');
    console.log('   - Check if the workout was published to these relays');
    process.exit(1);
  }

  // Sort by most recent
  eventsArray.sort((a, b) => b.created_at! - a.created_at!);

  console.log(`✅ Found ${eventsArray.length} workout event(s)\n`);
  console.log('================================================\n');

  // Analyze each event (focus on most recent)
  for (let i = 0; i < Math.min(3, eventsArray.length); i++) {
    const event = eventsArray[i];
    const eventNum = i + 1;

    console.log(`\n📋 Event #${eventNum} (${i === 0 ? 'MOST RECENT' : 'Older'})`);
    console.log('================================================\n');

    console.log(`Event ID: ${event.id}`);
    console.log(`Created: ${new Date(event.created_at! * 1000).toLocaleString()}`);
    console.log(`Content: ${event.content.substring(0, 100)}${event.content.length > 100 ? '...' : ''}\n`);

    // Parse tags
    const tags = event.tags;

    // Find team tag
    const teamTag = tags.find(t => t[0] === 'team');
    const hasTeamTag = teamTag && teamTag[1] === RUNSTR_TEAM_ID;

    // Find distance tag
    const distanceTag = tags.find(t => t[0] === 'distance');
    const distance = distanceTag ? `${distanceTag[1]} ${distanceTag[2] || 'km'}` : 'Not found';

    // Find activity type
    const activityTag = tags.find(t => t[0] === 't');
    const activity = activityTag ? activityTag[1] : 'Not found';

    // Find all split tags
    const splitTags = tags.filter(t => t[0] === 'split');
    const splits: SplitData[] = splitTags
      .map(tag => ({
        km: parseInt(tag[1]),
        time: tag[2],
        seconds: parseTimeToSeconds(tag[2]),
      }))
      .sort((a, b) => a.km - b.km);

    // Display findings
    console.log('📊 Tag Analysis:');
    console.log('----------------\n');

    console.log(`${hasTeamTag ? '✅' : '❌'} Team Tag:`);
    if (teamTag) {
      console.log(`   Found: ['team', '${teamTag[1]}']`);
      if (teamTag[1] === RUNSTR_TEAM_ID) {
        console.log(`   ✅ Matches RUNSTR Team ID`);
      } else {
        console.log(`   ⚠️  Does NOT match RUNSTR Team ID`);
        console.log(`   Expected: ${RUNSTR_TEAM_ID}`);
      }
    } else {
      console.log(`   ❌ No team tag found!`);
    }
    console.log();

    console.log(`${distanceTag ? '✅' : '❌'} Distance: ${distance}`);
    console.log(`${activityTag ? '✅' : '❌'} Activity Type: ${activity}\n`);

    console.log(`${splits.length > 0 ? '✅' : '❌'} Splits: ${splits.length} found`);
    if (splits.length > 0) {
      console.log('   Split Data:');
      splits.forEach(split => {
        const marker = split.km === 5 ? ' ← 5K TIME' :
                      split.km === 10 ? ' ← 10K TIME' :
                      split.km === 21 ? ' ← HALF MARATHON TIME' :
                      split.km === 42 ? ' ← MARATHON TIME' : '';
        console.log(`   - Split ${split.km}: ${split.time} (${split.km}km)${marker}`);
      });
    } else {
      console.log('   ❌ No split tags found!');
    }
    console.log();

    // Calculate expected leaderboards
    console.log('🏆 Expected Leaderboards:');
    console.log('-------------------------\n');

    const leaderboards: string[] = [];

    if (splits.length >= 5) {
      const split5 = splits.find(s => s.km === 5);
      if (split5) {
        leaderboards.push('5K');
        console.log(`✅ 5K Leaderboard (split count ${splits.length} ≥ 5)`);
        console.log(`   Your 5K time: ${split5.time}`);
      } else {
        console.log(`⚠️  5K Leaderboard (split count ${splits.length} ≥ 5)`);
        console.log(`   Missing split #5 - cannot calculate 5K time`);
      }
    } else {
      console.log(`❌ 5K Leaderboard (split count ${splits.length} < 5)`);
    }
    console.log();

    if (splits.length >= 10) {
      const split10 = splits.find(s => s.km === 10);
      if (split10) {
        leaderboards.push('10K');
        console.log(`✅ 10K Leaderboard (split count ${splits.length} ≥ 10)`);
        console.log(`   Your 10K time: ${split10.time}`);
      } else {
        console.log(`⚠️  10K Leaderboard (split count ${splits.length} ≥ 10)`);
        console.log(`   Missing split #10 - cannot calculate 10K time`);
      }
    } else {
      console.log(`❌ 10K Leaderboard (split count ${splits.length} < 10)`);
    }
    console.log();

    if (splits.length >= 21) {
      const split21 = splits.find(s => s.km === 21);
      if (split21) {
        leaderboards.push('Half Marathon');
        console.log(`✅ Half Marathon Leaderboard (split count ${splits.length} ≥ 21)`);
        console.log(`   Your Half Marathon time: ${split21.time}`);
      } else {
        console.log(`⚠️  Half Marathon Leaderboard (split count ${splits.length} ≥ 21)`);
        console.log(`   Missing split #21 - cannot calculate Half time`);
      }
    }
    console.log();

    if (splits.length >= 42) {
      const split42 = splits.find(s => s.km === 42);
      if (split42) {
        leaderboards.push('Marathon');
        console.log(`✅ Marathon Leaderboard (split count ${splits.length} ≥ 42)`);
        console.log(`   Your Marathon time: ${split42.time}`);
      } else {
        console.log(`⚠️  Marathon Leaderboard (split count ${splits.length} ≥ 42)`);
        console.log(`   Missing split #42 - cannot calculate Marathon time`);
      }
    }

    // Summary
    console.log('\n📝 Summary:');
    console.log('-----------\n');

    const issues: string[] = [];

    if (!hasTeamTag) {
      issues.push('Missing or incorrect team tag');
    }
    if (splits.length === 0) {
      issues.push('No split data found');
    }
    if (!distanceTag) {
      issues.push('Missing distance tag');
    }

    if (issues.length === 0 && leaderboards.length > 0) {
      console.log('✅ Event has all required data!');
      console.log(`✅ Should appear on ${leaderboards.length} leaderboard(s): ${leaderboards.join(', ')}\n`);

      console.log('💡 If leaderboard is not appearing:');
      console.log('   1. Check if viewing the correct team page (RUNSTR Team)');
      console.log('   2. Verify team page is showing "Daily Leaderboards" section');
      console.log('   3. Check if leaderboard query is using correct team ID filter');
      console.log('   4. Ensure app is connected to Nostr relays');
      console.log('   5. Try refreshing the team page');
    } else {
      console.log(`❌ Issues Found (${issues.length}):`);
      issues.forEach(issue => console.log(`   - ${issue}`));
      console.log();

      if (!hasTeamTag) {
        console.log('💡 Fix: Set RUNSTR Team as your "Competition Team" in app settings');
        console.log('   Then re-publish workout to add team tag\n');
      }
      if (splits.length === 0) {
        console.log('💡 Fix: Ensure split tracking is enabled during workout');
        console.log('   SplitTrackingService should generate kilometer splits\n');
      }
    }

    console.log('\n================================================\n');
  }

  process.exit(0);
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
