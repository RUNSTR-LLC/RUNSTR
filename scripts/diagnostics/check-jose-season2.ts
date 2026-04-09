#!/usr/bin/env node
/**
 * Diagnostic script to query ALL kind 1301 events for Jose Sammut during Season 2
 *
 * Purpose: Find missing ~8.4km of workouts that aren't appearing on leaderboard
 * User reports: 68.2km total, but leaderboard shows only ~59.8km (8 runs)
 *
 * This script will reveal:
 * - Total workout count and breakdown by exercise type
 * - Any workouts with wrong exercise type tags
 * - Any workouts with malformed distance/duration tags
 * - Any workouts outside the expected date range
 */

import NDK, { NDKEvent, NDKFilter } from '@nostr-dev-kit/ndk';

// Jose Sammut's pubkey
const JOSE_HEX_PUBKEY = '24b45900a92fbc4527ccf975bd416988e444c6e4d9f364c5158667f077623fe2';
const JOSE_NPUB = 'npub1yj69jq9f977y2f7vl96m6stf3rjyf3hym8ekf3g4senlqamz8l3qfsvhk7';

// Season 2 date range: Jan 1, 2026 00:00:00 UTC to Mar 1, 2026 23:59:59 UTC
const SEASON2_START = Math.floor(new Date('2026-01-01T00:00:00Z').getTime() / 1000);
const SEASON2_END = Math.floor(new Date('2026-03-01T23:59:59Z').getTime() / 1000);

// Relay configuration
const RELAYS = [
  'wss://relay.damus.io',
  'wss://relay.primal.net',
  'wss://nos.lol',
  'wss://relay.nostr.band'
];

interface WorkoutData {
  eventId: string;
  timestamp: number;
  timestampReadable: string;
  exercise: string;
  distance: string;
  distanceValue: number;
  distanceUnit: string;
  duration: string;
  content: string;
  allTags: string[][];
}

function parseDistance(distanceTags: string[]): { value: number; unit: string; raw: string } {
  if (!distanceTags || distanceTags.length === 0) {
    return { value: 0, unit: '', raw: 'NOT_FOUND' };
  }

  // Distance format in kind 1301: ['distance', '5.2', 'km']
  const value = parseFloat(distanceTags[1] || '0');
  const unit = distanceTags[2] || '';
  const raw = distanceTags.join(', ');

  return { value, unit, raw };
}

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
}

async function queryJoseWorkouts(): Promise<void> {
  console.log('='.repeat(80));
  console.log('JOSE SAMMUT SEASON 2 WORKOUT DIAGNOSTIC');
  console.log('='.repeat(80));
  console.log(`\nQuerying for user: ${JOSE_NPUB}`);
  console.log(`Hex pubkey: ${JOSE_HEX_PUBKEY}`);
  console.log(`\nSeason 2 range:`);
  console.log(`  Start: ${formatTimestamp(SEASON2_START)}`);
  console.log(`  End:   ${formatTimestamp(SEASON2_END)}`);
  console.log(`\nConnecting to ${RELAYS.length} relays...`);

  // Initialize NDK
  const ndk = new NDK({
    explicitRelayUrls: RELAYS,
    enableOutboxModel: false
  });

  await ndk.connect(2000);

  const connectedRelays = Array.from(ndk.pool?.relays.values() || [])
    .filter(relay => relay.status === 1).length;
  console.log(`Connected to ${connectedRelays}/${RELAYS.length} relays\n`);

  // Query ALL kind 1301 events for Jose during Season 2
  const filter: NDKFilter = {
    kinds: [1301],
    authors: [JOSE_HEX_PUBKEY],
    since: SEASON2_START,
    until: SEASON2_END
  };

  console.log('Fetching events with filter:');
  console.log(JSON.stringify(filter, null, 2));
  console.log('\nQuerying...\n');

  const events = await ndk.fetchEvents(filter);
  const eventArray = Array.from(events);

  console.log(`Found ${eventArray.length} total kind 1301 events\n`);
  console.log('='.repeat(80));

  if (eventArray.length === 0) {
    console.log('\n⚠️  NO EVENTS FOUND - This is unexpected!');
    console.log('Possible causes:');
    console.log('  - Workouts published to different relays');
    console.log('  - Wrong pubkey');
    console.log('  - Events deleted');
    console.log('  - Events outside date range');
    return;
  }

  // Parse and collect workout data
  const workouts: WorkoutData[] = [];

  for (const event of eventArray) {
    const exerciseTag = event.tags.find(t => t[0] === 'exercise');
    const distanceTag = event.tags.find(t => t[0] === 'distance');
    const durationTag = event.tags.find(t => t[0] === 'duration');

    const exercise = exerciseTag ? exerciseTag[1] : 'NOT_FOUND';
    const distance = parseDistance(distanceTag || []);
    const duration = durationTag ? durationTag[1] : 'NOT_FOUND';

    workouts.push({
      eventId: event.id,
      timestamp: event.created_at || 0,
      timestampReadable: formatTimestamp(event.created_at || 0),
      exercise,
      distance: distance.raw,
      distanceValue: distance.value,
      distanceUnit: distance.unit,
      duration,
      content: event.content.substring(0, 100),
      allTags: event.tags
    });
  }

  // Sort by timestamp
  workouts.sort((a, b) => a.timestamp - b.timestamp);

  // Print each workout
  console.log('\nDETAILED WORKOUT LIST:\n');
  workouts.forEach((workout, index) => {
    console.log(`\n[${index + 1}] Event ID: ${workout.eventId}`);
    console.log(`    Timestamp: ${workout.timestampReadable}`);
    console.log(`    Exercise: ${workout.exercise}`);
    console.log(`    Distance: ${workout.distance} (value: ${workout.distanceValue} ${workout.distanceUnit})`);
    console.log(`    Duration: ${workout.duration}`);
    console.log(`    Content: ${workout.content}${workout.content.length >= 100 ? '...' : ''}`);
    console.log(`    All tags:`);
    workout.allTags.forEach(tag => {
      console.log(`      [${tag.join(', ')}]`);
    });
  });

  // Generate summary
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY:');
  console.log('='.repeat(80));

  // Count by exercise type
  const exerciseTypeCounts: { [key: string]: number } = {};
  const exerciseTypeDistances: { [key: string]: number } = {};

  workouts.forEach(workout => {
    exerciseTypeCounts[workout.exercise] = (exerciseTypeCounts[workout.exercise] || 0) + 1;

    // Convert miles to km for total calculation
    let distanceInKm = workout.distanceValue;
    if (workout.distanceUnit.toLowerCase() === 'mi') {
      distanceInKm = workout.distanceValue * 1.60934;
    }

    exerciseTypeDistances[workout.exercise] =
      (exerciseTypeDistances[workout.exercise] || 0) + distanceInKm;
  });

  console.log(`\nTotal Events: ${workouts.length}`);
  console.log('\nBreakdown by Exercise Type:');
  Object.keys(exerciseTypeCounts).sort().forEach(type => {
    const count = exerciseTypeCounts[type];
    const totalDistance = exerciseTypeDistances[type].toFixed(2);
    console.log(`  ${type}: ${count} workouts, ${totalDistance} km total`);
  });

  // Calculate running-specific stats
  const runningWorkouts = workouts.filter(w => w.exercise === 'running');
  const runningDistanceKm = runningWorkouts.reduce((sum, w) => {
    let distanceInKm = w.distanceValue;
    if (w.distanceUnit.toLowerCase() === 'mi') {
      distanceInKm = w.distanceValue * 1.60934;
    }
    return sum + distanceInKm;
  }, 0);

  console.log(`\nRunning Workouts: ${runningWorkouts.length}`);
  console.log(`Total Running Distance: ${runningDistanceKm.toFixed(2)} km`);

  // List non-running workouts
  const nonRunningWorkouts = workouts.filter(w => w.exercise !== 'running');
  if (nonRunningWorkouts.length > 0) {
    console.log(`\nNon-Running Workouts (${nonRunningWorkouts.length}):`);
    nonRunningWorkouts.forEach(w => {
      console.log(`  - ${w.exercise}: ${w.distanceValue} ${w.distanceUnit} on ${w.timestampReadable}`);
    });
  }

  // Flag any anomalies
  console.log('\n' + '='.repeat(80));
  console.log('ANOMALY CHECK:');
  console.log('='.repeat(80));

  const anomalies: string[] = [];

  // Check for missing tags
  workouts.forEach((w, i) => {
    if (w.exercise === 'NOT_FOUND') {
      anomalies.push(`[${i + 1}] Missing 'exercise' tag (Event: ${w.eventId})`);
    }
    if (w.distance === 'NOT_FOUND') {
      anomalies.push(`[${i + 1}] Missing 'distance' tag (Event: ${w.eventId})`);
    }
    if (w.duration === 'NOT_FOUND') {
      anomalies.push(`[${i + 1}] Missing 'duration' tag (Event: ${w.eventId})`);
    }
    if (w.distanceValue === 0) {
      anomalies.push(`[${i + 1}] Zero distance value (Event: ${w.eventId})`);
    }
    if (w.distanceUnit !== 'km' && w.distanceUnit !== 'mi') {
      anomalies.push(`[${i + 1}] Unexpected distance unit: '${w.distanceUnit}' (Event: ${w.eventId})`);
    }
  });

  if (anomalies.length > 0) {
    console.log('\n⚠️  Found anomalies:\n');
    anomalies.forEach(a => console.log(`  ${a}`));
  } else {
    console.log('\n✅ No anomalies detected - all events have proper tags');
  }

  // Expected vs actual
  console.log('\n' + '='.repeat(80));
  console.log('EXPECTED VS ACTUAL:');
  console.log('='.repeat(80));
  console.log(`\nUser reported total: 68.2 km`);
  console.log(`Leaderboard shows: ~59.8 km (8 runs)`);
  console.log(`This query found: ${runningDistanceKm.toFixed(2)} km (${runningWorkouts.length} running workouts)`);
  console.log(`\nDiscrepancy: ${(68.2 - runningDistanceKm).toFixed(2)} km missing`);

  if (runningDistanceKm < 68.2) {
    console.log('\n💡 Possible explanations for missing distance:');
    console.log('  1. Workouts tagged with wrong exercise type (check non-running workouts above)');
    console.log('  2. Workouts published to different relays not queried');
    console.log('  3. Workouts published before/after Season 2 date range');
    console.log('  4. Workouts with malformed tags not counted by leaderboard');
    console.log('  5. HealthKit sync created events with different format');
  }

  console.log('\n' + '='.repeat(80));
  console.log('END OF DIAGNOSTIC');
  console.log('='.repeat(80));
}

// Run the diagnostic
queryJoseWorkouts()
  .then(() => {
    console.log('\n✅ Diagnostic complete\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Error running diagnostic:', error);
    process.exit(1);
  });
