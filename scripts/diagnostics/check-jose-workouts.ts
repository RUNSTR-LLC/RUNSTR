/**
 * Diagnostic Script: Check Jose Sammut's Workout Events
 *
 * Purpose: Investigate why Jose's Season 2 leaderboard total (59.8 km)
 * doesn't match his workout history total (68.2 km).
 *
 * This script:
 * 1. Converts npub to hex pubkey using NDK
 * 2. Fetches ALL kind 1301 events from Jose Sammut
 * 3. Analyzes each workout for distance, duration, exercise type, dates
 * 4. Groups by month (January vs February 2026)
 * 5. Calculates totals and identifies potential filtering discrepancies
 */

import NDK, { NDKFilter, NDKEvent } from '@nostr-dev-kit/ndk';
import { nip19 } from 'nostr-tools';

// Jose Sammut's npub
const JOSE_NPUB = 'npub1yj69jq9f977y2f7vl96m6stf3rjyf3hym8ekf3g4senlqamz8l3qfsvhk7';

// Season 2 date range (from season2.ts)
const SEASON_2_START = '2026-01-01T00:00:00Z';
const SEASON_2_END = '2026-03-01T23:59:59Z';

// Default relays (from GlobalNDKService)
const RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.primal.net',
  'wss://relay.nostr.band',
];

interface WorkoutData {
  eventId: string;
  createdAt: number;
  date: string;
  exerciseType: string;
  distance: number;
  distanceUnit: string;
  duration: string;
  durationSeconds: number;
  content: string;
  teamTag?: string;
  tags: string[][];
}

/**
 * Convert npub to hex pubkey using NDK's nip19
 */
function npubToHex(npub: string): string {
  try {
    const decoded = nip19.decode(npub);
    if (decoded.type === 'npub') {
      return decoded.data as string;
    }
    throw new Error('Invalid npub format');
  } catch (error) {
    throw new Error(`Failed to decode npub: ${error}`);
  }
}

/**
 * Parse duration string (HH:MM:SS) to seconds
 */
function parseDuration(durationStr: string): number {
  const parts = durationStr.split(':');
  if (parts.length === 3) {
    const hours = parseInt(parts[0]);
    const minutes = parseInt(parts[1]);
    const seconds = parseInt(parts[2]);
    return hours * 3600 + minutes * 60 + seconds;
  } else if (parts.length === 2) {
    const minutes = parseInt(parts[0]);
    const seconds = parseInt(parts[1]);
    return minutes * 60 + seconds;
  }
  return 0;
}

/**
 * Parse kind 1301 event into structured workout data
 */
function parseWorkout(event: NDKEvent): WorkoutData | null {
  try {
    const getTag = (name: string) => event.tags.find(t => t[0] === name)?.[1];

    const exerciseType = getTag('exercise') || 'unknown';
    const distanceStr = getTag('distance');
    const durationStr = getTag('duration');
    const teamTag = getTag('team');

    if (!distanceStr || !durationStr) {
      return null;
    }

    // Parse distance - could be "5.2" or "5.2 km"
    const distanceParts = distanceStr.split(' ');
    const distance = parseFloat(distanceParts[0]);
    const distanceUnit = distanceParts[1] || 'km';

    const durationSeconds = parseDuration(durationStr);

    // Convert timestamp to human-readable date
    const date = new Date(event.created_at! * 1000).toISOString();

    return {
      eventId: event.id,
      createdAt: event.created_at!,
      date,
      exerciseType,
      distance,
      distanceUnit,
      duration: durationStr,
      durationSeconds,
      content: event.content || '',
      teamTag,
      tags: event.tags,
    };
  } catch (error) {
    console.error('Failed to parse workout event:', error);
    return null;
  }
}

/**
 * Main diagnostic function
 */
async function diagnoseJoseWorkouts() {
  console.log('🔍 JOSE SAMMUT WORKOUT DIAGNOSTIC SCRIPT');
  console.log('═'.repeat(80));
  console.log('');

  // Step 1: Convert npub to hex
  console.log('Step 1: Converting npub to hex pubkey...');
  const hexPubkey = npubToHex(JOSE_NPUB);
  console.log(`✅ npub: ${JOSE_NPUB}`);
  console.log(`✅ hex:  ${hexPubkey}`);
  console.log('');

  // Step 2: Connect to NDK
  console.log('Step 2: Connecting to Nostr relays...');
  const ndk = new NDK({
    explicitRelayUrls: RELAYS,
    autoConnectUserRelays: false,
    autoFetchUserMutelist: false,
  });

  console.log(`   Relays: ${RELAYS.join(', ')}`);
  await ndk.connect(10000); // 10 second timeout

  const connectedRelays = ndk.pool?.stats()?.connected || 0;
  console.log(`✅ Connected to ${connectedRelays}/${RELAYS.length} relays`);
  console.log('');

  // Step 3: Fetch ALL kind 1301 events from Jose
  console.log('Step 3: Fetching ALL kind 1301 workout events...');
  console.log(`   Author: ${hexPubkey}`);
  console.log('   No time filter - fetching ALL workouts ever published');
  console.log('');

  const filter: NDKFilter = {
    kinds: [1301],
    authors: [hexPubkey],
    limit: 1000, // High limit to get all workouts
  };

  const events = await ndk.fetchEvents(filter);
  console.log(`✅ Fetched ${events.size} total workout events`);
  console.log('');

  // Step 4: Parse and analyze workouts
  console.log('Step 4: Parsing and analyzing workouts...');
  console.log('');

  const workouts: WorkoutData[] = [];
  for (const event of events) {
    const workout = parseWorkout(event);
    if (workout) {
      workouts.push(workout);
    }
  }

  // Sort by date (oldest first)
  workouts.sort((a, b) => a.createdAt - b.createdAt);

  console.log(`✅ Parsed ${workouts.length} valid workouts`);
  console.log('');

  // Step 5: Print all workouts with details
  console.log('═'.repeat(80));
  console.log('ALL WORKOUTS (chronological order)');
  console.log('═'.repeat(80));
  console.log('');

  workouts.forEach((w, index) => {
    const dateObj = new Date(w.createdAt * 1000);
    const monthYear = `${dateObj.getUTCFullYear()}-${String(dateObj.getUTCMonth() + 1).padStart(2, '0')}`;

    console.log(`Workout #${index + 1}`);
    console.log(`  Event ID: ${w.eventId}`);
    console.log(`  Date: ${w.date}`);
    console.log(`  Month: ${monthYear}`);
    console.log(`  Exercise: ${w.exerciseType}`);
    console.log(`  Distance: ${w.distance} ${w.distanceUnit}`);
    console.log(`  Duration: ${w.duration} (${w.durationSeconds}s)`);
    if (w.teamTag) {
      console.log(`  Team: ${w.teamTag}`);
    }
    console.log(`  Content: ${w.content.substring(0, 100)}${w.content.length > 100 ? '...' : ''}`);
    console.log('');
  });

  // Step 6: Group by month and calculate totals
  console.log('═'.repeat(80));
  console.log('ANALYSIS BY MONTH');
  console.log('═'.repeat(80));
  console.log('');

  const jan2026Start = new Date('2026-01-01T00:00:00Z').getTime() / 1000;
  const jan2026End = new Date('2026-02-01T00:00:00Z').getTime() / 1000;
  const feb2026Start = jan2026End;
  const feb2026End = new Date('2026-03-01T00:00:00Z').getTime() / 1000;

  const janWorkouts = workouts.filter(w => w.createdAt >= jan2026Start && w.createdAt < jan2026End);
  const febWorkouts = workouts.filter(w => w.createdAt >= feb2026Start && w.createdAt < feb2026End);
  const otherWorkouts = workouts.filter(w => w.createdAt < jan2026Start || w.createdAt >= feb2026End);

  console.log(`January 2026 Workouts: ${janWorkouts.length}`);
  console.log(`  Total distance: ${janWorkouts.reduce((sum, w) => sum + w.distance, 0).toFixed(2)} km`);
  console.log(`  By activity type:`);
  const janByType = janWorkouts.reduce((acc, w) => {
    acc[w.exerciseType] = (acc[w.exerciseType] || 0) + w.distance;
    return acc;
  }, {} as Record<string, number>);
  Object.entries(janByType).forEach(([type, dist]) => {
    console.log(`    ${type}: ${dist.toFixed(2)} km`);
  });
  console.log('');

  console.log(`February 2026 Workouts: ${febWorkouts.length}`);
  console.log(`  Total distance: ${febWorkouts.reduce((sum, w) => sum + w.distance, 0).toFixed(2)} km`);
  console.log(`  By activity type:`);
  const febByType = febWorkouts.reduce((acc, w) => {
    acc[w.exerciseType] = (acc[w.exerciseType] || 0) + w.distance;
    return acc;
  }, {} as Record<string, number>);
  Object.entries(febByType).forEach(([type, dist]) => {
    console.log(`    ${type}: ${dist.toFixed(2)} km`);
  });
  console.log('');

  if (otherWorkouts.length > 0) {
    console.log(`Other Workouts (outside Season 2): ${otherWorkouts.length}`);
    console.log(`  Total distance: ${otherWorkouts.reduce((sum, w) => sum + w.distance, 0).toFixed(2)} km`);
    console.log('');
  }

  // Step 7: Season 2 analysis
  console.log('═'.repeat(80));
  console.log('SEASON 2 ANALYSIS (Jan 1 - Mar 1, 2026)');
  console.log('═'.repeat(80));
  console.log('');

  const season2Workouts = workouts.filter(w => {
    const start = new Date(SEASON_2_START).getTime() / 1000;
    const end = new Date(SEASON_2_END).getTime() / 1000;
    return w.createdAt >= start && w.createdAt < end;
  });

  console.log(`Total Season 2 Workouts: ${season2Workouts.length}`);
  console.log(`Total Season 2 Distance: ${season2Workouts.reduce((sum, w) => sum + w.distance, 0).toFixed(2)} km`);
  console.log('');

  // Group by activity type
  const byActivityType = season2Workouts.reduce((acc, w) => {
    acc[w.exerciseType] = (acc[w.exerciseType] || 0) + w.distance;
    return acc;
  }, {} as Record<string, number>);

  console.log('Distance by Activity Type:');
  Object.entries(byActivityType).forEach(([type, dist]) => {
    console.log(`  ${type}: ${dist.toFixed(2)} km`);
  });
  console.log('');

  // Step 8: Identify "running" workouts specifically
  console.log('═'.repeat(80));
  console.log('RUNNING WORKOUTS ANALYSIS');
  console.log('═'.repeat(80));
  console.log('');

  const runningWorkouts = season2Workouts.filter(w =>
    w.exerciseType.toLowerCase() === 'running'
  );

  console.log(`Running Workouts: ${runningWorkouts.length}`);
  console.log(`Total Running Distance: ${runningWorkouts.reduce((sum, w) => sum + w.distance, 0).toFixed(2)} km`);
  console.log('');

  console.log('HYPOTHESIS: The leaderboard may be filtering for:');
  console.log(`  1. Activity type = "running" only (not walking/cycling)`);
  console.log(`  2. Date range = Season 2 (Jan 1 - Mar 1, 2026)`);
  console.log(`  3. Specific team tag filtering`);
  console.log('');

  // Step 9: Compare totals
  console.log('═'.repeat(80));
  console.log('DISCREPANCY ANALYSIS');
  console.log('═'.repeat(80));
  console.log('');

  const totalAllWorkouts = workouts.reduce((sum, w) => sum + w.distance, 0);
  const totalSeason2 = season2Workouts.reduce((sum, w) => sum + w.distance, 0);
  const totalRunning = runningWorkouts.reduce((sum, w) => sum + w.distance, 0);

  console.log(`Reported Workout History Total: 68.2 km`);
  console.log(`Reported Leaderboard Total: 59.8 km`);
  console.log(`Discrepancy: ${(68.2 - 59.8).toFixed(2)} km`);
  console.log('');
  console.log(`Calculated Totals:`);
  console.log(`  All workouts (all time): ${totalAllWorkouts.toFixed(2)} km`);
  console.log(`  Season 2 workouts (Jan 1 - Mar 1): ${totalSeason2.toFixed(2)} km`);
  console.log(`  Season 2 running only: ${totalRunning.toFixed(2)} km`);
  console.log('');

  if (Math.abs(totalRunning - 59.8) < 0.5) {
    console.log('✅ MATCH FOUND: Leaderboard total matches running workouts only!');
    console.log('   Explanation: The leaderboard is filtering for running activities.');
  } else if (Math.abs(totalSeason2 - 59.8) < 0.5) {
    console.log('✅ MATCH FOUND: Leaderboard total matches Season 2 total!');
    console.log('   Explanation: The leaderboard is showing all Season 2 activities.');
  } else if (Math.abs(totalAllWorkouts - 68.2) < 0.5) {
    console.log('✅ MATCH FOUND: Workout history total matches all workouts!');
    console.log('   Explanation: The workout history shows all activities, not filtered by date.');
  } else {
    console.log('⚠️ NO EXACT MATCH: Further investigation needed.');
    console.log('   Check for:');
    console.log('   - Unit conversion (miles vs km)');
    console.log('   - Timezone differences');
    console.log('   - Cached vs fresh data');
  }
  console.log('');

  // Cleanup
  for (const relay of ndk.pool.relays.values()) {
    relay.disconnect();
  }

  console.log('✅ Diagnostic complete!');
}

// Run the diagnostic
diagnoseJoseWorkouts()
  .then(() => {
    console.log('');
    console.log('🎉 Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
