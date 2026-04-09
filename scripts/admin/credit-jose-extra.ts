#!/usr/bin/env tsx
/**
 * Admin Script: Credit Jose Sammut - Extra 3.4 km Running Workout
 *
 * Jose had a 3.4 km running workout on his local device that was never
 * submitted to Supabase. This script manually inserts the credit into
 * the workout_submissions table.
 *
 * Details:
 *   - Activity: running
 *   - Distance: 3.4 km (3400 meters)
 *   - Duration: ~20 minutes (1200 seconds) - reasonable pace
 *   - Date: Feb 9, 2026
 *   - Source: admin_credit
 *
 * Usage: npx tsx scripts/admin/credit-jose-extra.ts
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../../.env') });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const JOSE_NPUB = 'npub1yj69jq9f977y2f7vl96m6stf3rjyf3hym8ekf3g4senlqamz8l3qfsvhk7';

// --- Types ---
interface WorkoutRow {
  id: string;
  event_id: string;
  npub: string;
  activity_type: string;
  distance_meters: number | null;
  duration_seconds: number | null;
  calories: number | null;
  created_at: string;
  verified: boolean | null;
  source: string | null;
  raw_event: Record<string, unknown> | null;
  leaderboard_date: string | null;
}

// --- Helpers ---
async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'apikey': SUPABASE_KEY!,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`HTTP ${response.status}: ${body}`);
  }

  return response.json();
}

async function insertWorkoutSubmission(data: Record<string, unknown>): Promise<{ ok: boolean; error?: string }> {
  const url = `${SUPABASE_URL}/rest/v1/workout_submissions`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY!,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const body = await response.text();
    return { ok: false, error: `HTTP ${response.status}: ${body}` };
  }

  return { ok: true };
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '00:00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(Math.round(s)).padStart(2, '0')}`;
}

function metersToKm(meters: number | null): string {
  if (!meters && meters !== 0) return '?.??';
  return (meters / 1000).toFixed(2);
}

// --- Main ---
async function main() {
  console.log('='.repeat(70));
  console.log('  ADMIN: Credit Jose Sammut - Extra 3.4 km Running Workout');
  console.log('='.repeat(70));
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`npub:      ${JOSE_NPUB}`);
  console.log('');

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('ERROR: Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env');
    process.exit(1);
  }

  // ====================================================================
  // Step 1: Prepare the workout credit data
  // ====================================================================
  const eventId = 'admin-credit-jose-3400m-' + Date.now();
  const createdAt = '2026-02-09T12:00:00Z';
  const leaderboardDate = '2026-02-09';

  const insertData: Record<string, unknown> = {
    npub: JOSE_NPUB,
    event_id: eventId,
    activity_type: 'running',
    distance_meters: 3400,
    duration_seconds: 1200,
    calories: null,
    created_at: createdAt,
    source: 'admin_credit',
    verified: true,
    verification_status: 'legacy',
    leaderboard_date: leaderboardDate,
    raw_event: {
      note: 'Admin credit for a 3.4 km running workout that existed on Jose\'s local device but was never submitted to Supabase.',
      admin_action: 'manual_credit',
      credited_by: 'admin script: scripts/admin/credit-jose-extra.ts',
      credited_at: new Date().toISOString(),
      original_distance_km: 3.4,
      original_duration_minutes: 20,
    },
  };

  console.log('STEP 1: Prepared workout credit data');
  console.log(`  Event ID:  ${eventId}`);
  console.log(`  Activity:  running`);
  console.log(`  Distance:  3.40 km (3400 meters)`);
  console.log(`  Duration:  ${formatDuration(1200)} (1200 seconds)`);
  console.log(`  Date:      ${leaderboardDate}`);
  console.log(`  Source:    admin_credit`);
  console.log('');

  // ====================================================================
  // Step 2: Insert into workout_submissions
  // ====================================================================
  console.log('STEP 2: Inserting workout into workout_submissions...');

  const result = await insertWorkoutSubmission(insertData);

  if (result.ok) {
    console.log('  SUCCESS: Workout inserted successfully');
  } else {
    console.error(`  FAILED: ${result.error}`);
    process.exit(1);
  }
  console.log('');

  // ====================================================================
  // Step 3: Verify the insert succeeded
  // ====================================================================
  console.log('STEP 3: Verifying inserted record...');

  const verifyUrl = `${SUPABASE_URL}/rest/v1/workout_submissions?event_id=eq.${eventId}&select=id,event_id,activity_type,distance_meters,duration_seconds,source,verified,leaderboard_date`;
  const rows = await fetchJson<WorkoutRow[]>(verifyUrl);

  if (rows.length > 0) {
    const r = rows[0];
    console.log(`  VERIFIED: Record found in workout_submissions`);
    console.log(`    ID:            ${r.id}`);
    console.log(`    Event ID:      ${r.event_id}`);
    console.log(`    Activity:      ${r.activity_type}`);
    console.log(`    Distance:      ${metersToKm(r.distance_meters)} km`);
    console.log(`    Duration:      ${formatDuration(r.duration_seconds)}`);
    console.log(`    Source:        ${r.source}`);
    console.log(`    Verified:      ${r.verified}`);
    console.log(`    Leaderboard:   ${r.leaderboard_date}`);
  } else {
    console.error('  ERROR: Record NOT found after insert! Something went wrong.');
    process.exit(1);
  }
  console.log('');

  // ====================================================================
  // Step 4: Query Jose's updated totals
  // ====================================================================
  console.log('STEP 4: Calculating Jose\'s updated totals...');
  console.log('');

  const allWorkoutsUrl = `${SUPABASE_URL}/rest/v1/workout_submissions?npub=eq.${JOSE_NPUB}&select=*&order=created_at.asc`;
  const allWorkouts = await fetchJson<WorkoutRow[]>(allWorkoutsUrl);

  console.log(`  Total workout_submissions records: ${allWorkouts.length}`);
  console.log('');

  // Running totals
  const runningWorkouts = allWorkouts.filter(w => w.activity_type?.toLowerCase() === 'running');
  const totalRunningDist = runningWorkouts.reduce((sum, w) => sum + (Number(w.distance_meters) || 0), 0);
  const totalRunningDur = runningWorkouts.reduce((sum, w) => sum + (Number(w.duration_seconds) || 0), 0);

  // Walking totals
  const walkingWorkouts = allWorkouts.filter(w => w.activity_type?.toLowerCase() === 'walking');
  const totalWalkingDist = walkingWorkouts.reduce((sum, w) => sum + (Number(w.distance_meters) || 0), 0);

  // Cycling totals
  const cyclingWorkouts = allWorkouts.filter(w => w.activity_type?.toLowerCase() === 'cycling');
  const totalCyclingDist = cyclingWorkouts.reduce((sum, w) => sum + (Number(w.distance_meters) || 0), 0);

  // All-activity totals
  const totalAllDist = allWorkouts.reduce((sum, w) => sum + (Number(w.distance_meters) || 0), 0);

  console.log('  RUNNING:');
  console.log(`    Workouts:  ${runningWorkouts.length}`);
  console.log(`    Distance:  ${metersToKm(totalRunningDist)} km`);
  console.log(`    Duration:  ${formatDuration(totalRunningDur)}`);
  console.log('');
  console.log('  WALKING:');
  console.log(`    Workouts:  ${walkingWorkouts.length}`);
  console.log(`    Distance:  ${metersToKm(totalWalkingDist)} km`);
  console.log('');
  if (cyclingWorkouts.length > 0) {
    console.log('  CYCLING:');
    console.log(`    Workouts:  ${cyclingWorkouts.length}`);
    console.log(`    Distance:  ${metersToKm(totalCyclingDist)} km`);
    console.log('');
  }
  console.log('  ALL ACTIVITIES:');
  console.log(`    Workouts:  ${allWorkouts.length}`);
  console.log(`    Distance:  ${metersToKm(totalAllDist)} km`);
  console.log('');

  // Breakdown by source
  const bySrc = new Map<string, number>();
  for (const w of allWorkouts) {
    const src = w.source || 'null';
    bySrc.set(src, (bySrc.get(src) || 0) + 1);
  }
  console.log('  BY SOURCE:');
  for (const [src, count] of Array.from(bySrc.entries()).sort()) {
    console.log(`    ${src}: ${count}`);
  }
  console.log('');

  // List all workouts
  console.log('  ALL WORKOUTS (chronological):');
  console.log('-'.repeat(95));
  console.log('  #  | Date       | Activity  | Dist (km) | Duration  | Source        | Verified');
  console.log('-'.repeat(95));

  for (let i = 0; i < allWorkouts.length; i++) {
    const w = allWorkouts[i];
    const dateStr = w.leaderboard_date || new Date(w.created_at).toISOString().split('T')[0];
    const distKm = metersToKm(Number(w.distance_meters)).padStart(9);
    const dur = formatDuration(Number(w.duration_seconds));
    const src = (w.source || 'null').padEnd(13);
    const activity = (w.activity_type || 'unknown').padEnd(9);
    const verified = String(w.verified ?? 'null');

    console.log(`  ${String(i + 1).padStart(2)} | ${dateStr} | ${activity} | ${distKm} | ${dur} | ${src} | ${verified}`);
  }
  console.log('-'.repeat(95));

  console.log('');
  console.log('='.repeat(70));
  console.log('  COMPLETE: 3.4 km running workout credited to Jose Sammut');
  console.log('='.repeat(70));

  process.exit(0);
}

main().catch(err => {
  console.error('Script error:', err);
  process.exit(1);
});
