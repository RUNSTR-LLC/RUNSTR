#!/usr/bin/env tsx
/**
 * Admin Script: Credit Jose Sammut's Flagged Workouts
 *
 * Jose has 2 workouts in flagged_workouts that were real workouts
 * incorrectly flagged by anti-cheat:
 *
 *   1. Jan 16, 2026 - running, 0.09 km, 22:15 duration
 *      Reason: "Pace too slow for running" (GPS glitch but real workout)
 *
 *   2. Feb 9, 2026 - walking, 4.84 km, 0 duration
 *      Reason: "4.84 km with 0 duration - invalid submission" (duration not captured)
 *
 * This script:
 *   - Fetches the flagged records to get raw_event data and event_ids
 *   - Inserts them into workout_submissions with source='admin_credit'
 *   - Does NOT delete from flagged_workouts (audit trail preserved)
 *   - Verifies insertion and prints updated totals
 *
 * Usage: npx tsx scripts/admin/credit-jose-workouts.ts
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../../.env') });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const JOSE_NPUB = 'npub1yj69jq9f977y2f7vl96m6stf3rjyf3hym8ekf3g4senlqamz8l3qfsvhk7';

// --- Types ---
interface FlaggedRow {
  id: string;
  event_id: string;
  npub: string;
  activity_type: string | null;
  distance_meters: number | null;
  duration_seconds: number | null;
  created_at: string;
  reason: string;
  raw_event: Record<string, unknown> | null;
  reviewed: boolean | null;
  reviewer_notes: string | null;
}

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
  console.log('  ADMIN: Credit Jose Sammut Flagged Workouts');
  console.log('='.repeat(70));
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`npub:      ${JOSE_NPUB}`);
  console.log('');

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('ERROR: Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env');
    process.exit(1);
  }

  // ====================================================================
  // Step 1: Fetch Jose's flagged workouts
  // ====================================================================
  console.log('STEP 1: Fetching Jose\'s flagged workouts...');
  const flaggedUrl = `${SUPABASE_URL}/rest/v1/flagged_workouts?npub=eq.${JOSE_NPUB}&select=*&order=created_at.asc`;
  const flagged = await fetchJson<FlaggedRow[]>(flaggedUrl);

  console.log(`  Found ${flagged.length} flagged workout(s)\n`);

  if (flagged.length === 0) {
    console.log('ERROR: No flagged workouts found for Jose. Nothing to credit.');
    process.exit(1);
  }

  // Print each flagged workout
  for (let i = 0; i < flagged.length; i++) {
    const f = flagged[i];
    const date = new Date(f.created_at).toISOString().replace('T', ' ').slice(0, 19);
    console.log(`  Flagged #${i + 1}:`);
    console.log(`    Date:      ${date} UTC`);
    console.log(`    Activity:  ${f.activity_type}`);
    console.log(`    Distance:  ${metersToKm(f.distance_meters)} km (${f.distance_meters ?? 0} meters)`);
    console.log(`    Duration:  ${formatDuration(f.duration_seconds)} (${f.duration_seconds ?? 0} sec)`);
    console.log(`    Reason:    ${f.reason}`);
    console.log(`    Event ID:  ${f.event_id}`);
    console.log(`    Has raw_event: ${f.raw_event ? 'YES' : 'NO'}`);
    console.log('');
  }

  // ====================================================================
  // Step 2: Check these event_ids don't already exist in workout_submissions
  // ====================================================================
  console.log('STEP 2: Checking for duplicate event_ids in workout_submissions...');

  for (const f of flagged) {
    const checkUrl = `${SUPABASE_URL}/rest/v1/workout_submissions?event_id=eq.${f.event_id}&select=id,event_id`;
    const existing = await fetchJson<{ id: string; event_id: string }[]>(checkUrl);

    if (existing.length > 0) {
      console.log(`  WARNING: event_id ${f.event_id.slice(0, 16)}... already exists in workout_submissions!`);
      console.log(`  Skipping this workout to avoid duplicate.`);
      // Remove from the flagged array so we don't try to insert
      const idx = flagged.indexOf(f);
      if (idx > -1) flagged.splice(idx, 1);
    } else {
      console.log(`  OK: ${f.event_id.slice(0, 16)}... not in workout_submissions`);
    }
  }
  console.log('');

  if (flagged.length === 0) {
    console.log('All flagged workouts already exist in workout_submissions. Nothing to insert.');
    process.exit(0);
  }

  // ====================================================================
  // Step 3: Insert flagged workouts into workout_submissions
  // ====================================================================
  console.log('STEP 3: Inserting flagged workouts into workout_submissions...');
  console.log('');

  let inserted = 0;
  let errors = 0;

  for (const f of flagged) {
    const date = new Date(f.created_at);
    const leaderboardDate = date.toISOString().split('T')[0]; // YYYY-MM-DD

    const insertData: Record<string, unknown> = {
      npub: f.npub,
      event_id: f.event_id,
      activity_type: f.activity_type,
      distance_meters: f.distance_meters,
      duration_seconds: f.duration_seconds,
      calories: null,
      raw_event: f.raw_event,
      created_at: f.created_at,
      source: 'admin_credit',
      verified: true,
      verification_status: 'legacy',
      leaderboard_date: leaderboardDate,
    };

    console.log(`  Inserting: ${f.activity_type}, ${metersToKm(f.distance_meters)} km, ${formatDuration(f.duration_seconds)}, date=${leaderboardDate}`);
    console.log(`    Event ID: ${f.event_id}`);

    const result = await insertWorkoutSubmission(insertData);

    if (result.ok) {
      console.log(`    SUCCESS`);
      inserted++;
    } else {
      console.log(`    FAILED: ${result.error}`);
      errors++;
    }
    console.log('');
  }

  console.log(`  Results: ${inserted} inserted, ${errors} errors`);
  console.log('');

  if (errors > 0) {
    console.log('WARNING: Some inserts failed. Check errors above.');
  }

  // ====================================================================
  // Step 4: Verify the new records appear in workout_submissions
  // ====================================================================
  console.log('STEP 4: Verifying inserted records...');

  for (const f of flagged) {
    const verifyUrl = `${SUPABASE_URL}/rest/v1/workout_submissions?event_id=eq.${f.event_id}&select=id,event_id,activity_type,distance_meters,duration_seconds,source,verified,leaderboard_date`;
    const rows = await fetchJson<WorkoutRow[]>(verifyUrl);

    if (rows.length > 0) {
      const r = rows[0];
      console.log(`  VERIFIED: ${r.event_id.slice(0, 16)}... -> ${r.activity_type}, ${metersToKm(r.distance_meters)} km, source=${r.source}, verified=${r.verified}`);
    } else {
      console.log(`  NOT FOUND: ${f.event_id.slice(0, 16)}... - insertion may have failed`);
    }
  }
  console.log('');

  // ====================================================================
  // Step 5: Calculate Jose's updated totals
  // ====================================================================
  console.log('STEP 5: Calculating Jose\'s updated totals...');
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
  console.log(`  COMPLETE: ${inserted} workout(s) credited to Jose Sammut`);
  console.log('='.repeat(70));

  process.exit(errors > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Script error:', err);
  process.exit(1);
});
