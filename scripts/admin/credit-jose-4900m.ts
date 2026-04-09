#!/usr/bin/env tsx
/**
 * Admin Script: Credit Jose Sammut - Missing 4.9 km Running Workout
 *
 * Jose's local device shows 68.2 km total running but leaderboard shows 63.3 km.
 * After deduplicating known duplicate events (Feb 1 and Feb 6), the Supabase
 * total is 63.32 km. This credits the missing ~4.88 km workout.
 *
 * Details:
 *   - Activity: running
 *   - Distance: 4.88 km (4880 meters) - exact gap to reach 68.2 km
 *   - Duration: ~23 minutes (1380 seconds) - consistent with Jose's pace
 *   - Date: Feb 10, 2026
 *   - Source: admin_credit
 *
 * Usage: npx tsx scripts/admin/credit-jose-4900m.ts
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../../.env') });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const JOSE_NPUB = 'npub1yj69jq9f977y2f7vl96m6stf3rjyf3hym8ekf3g4senlqamz8l3qfsvhk7';

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

async function main() {
  console.log('='.repeat(70));
  console.log('  ADMIN: Credit Jose Sammut - Missing 4.9 km Running Workout');
  console.log('='.repeat(70));
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`npub:      ${JOSE_NPUB}`);
  console.log('');

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('ERROR: Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env');
    process.exit(1);
  }

  // Step 0: Calculate exact gap before inserting
  console.log('STEP 0: Calculating current deduplicated running total...');
  const allUrl = `${SUPABASE_URL}/rest/v1/workout_submissions?npub=eq.${JOSE_NPUB}&activity_type=eq.running&select=*&order=created_at.asc`;
  const allRunning = await fetchJson<WorkoutRow[]>(allUrl);

  // Deduplicate: group by leaderboard_date + distance + duration, keep one per group
  const seen = new Map<string, WorkoutRow>();
  for (const w of allRunning) {
    const key = `${w.leaderboard_date}|${w.distance_meters}|${w.duration_seconds}`;
    if (!seen.has(key)) {
      seen.set(key, w);
    }
  }
  const dedupedWorkouts = Array.from(seen.values());
  const currentTotal = dedupedWorkouts.reduce((sum, w) => sum + (Number(w.distance_meters) || 0), 0);
  const currentTotalKm = currentTotal / 1000;
  const targetKm = 68.2;
  const gapMeters = Math.round((targetKm - currentTotalKm) * 1000);
  const gapKm = gapMeters / 1000;

  console.log(`  Raw running submissions: ${allRunning.length}`);
  console.log(`  Deduplicated running:    ${dedupedWorkouts.length}`);
  console.log(`  Current deduped total:   ${currentTotalKm.toFixed(2)} km`);
  console.log(`  Target total:            ${targetKm} km`);
  console.log(`  Gap to credit:           ${gapKm.toFixed(2)} km (${gapMeters} meters)`);
  console.log('');

  if (gapMeters <= 0) {
    console.log('  Jose already has >= 68.2 km. No credit needed!');
    process.exit(0);
  }

  // Step 1: Prepare the workout credit data
  const eventId = `admin-credit-jose-${gapMeters}m-` + Date.now();
  const createdAt = '2026-02-10T08:00:00Z';
  const leaderboardDate = '2026-02-10';
  // Estimate duration based on Jose's average pace (~4:45/km)
  const estimatedDurationSec = Math.round(gapKm * 285); // ~4:45 per km

  const insertData: Record<string, unknown> = {
    npub: JOSE_NPUB,
    event_id: eventId,
    activity_type: 'running',
    distance_meters: gapMeters,
    duration_seconds: estimatedDurationSec,
    calories: null,
    created_at: createdAt,
    source: 'admin_credit',
    verified: true,
    verification_status: 'legacy',
    leaderboard_date: leaderboardDate,
    raw_event: {
      note: `Admin credit for a ${gapKm.toFixed(2)} km running workout missing from Jose's Supabase records. Local device shows 68.2 km total but leaderboard showed ${currentTotalKm.toFixed(1)} km after deduplication.`,
      admin_action: 'manual_credit',
      credited_by: 'admin script: scripts/admin/credit-jose-4900m.ts',
      credited_at: new Date().toISOString(),
      original_distance_km: gapKm,
      dedup_total_before: currentTotalKm,
      target_total: targetKm,
    },
  };

  console.log('STEP 1: Prepared workout credit data');
  console.log(`  Event ID:  ${eventId}`);
  console.log(`  Activity:  running`);
  console.log(`  Distance:  ${gapKm.toFixed(2)} km (${gapMeters} meters)`);
  console.log(`  Duration:  ${formatDuration(estimatedDurationSec)} (${estimatedDurationSec} seconds)`);
  console.log(`  Date:      ${leaderboardDate}`);
  console.log(`  Source:    admin_credit`);
  console.log('');

  // Step 2: Insert into workout_submissions
  console.log('STEP 2: Inserting workout into workout_submissions...');
  const result = await insertWorkoutSubmission(insertData);

  if (result.ok) {
    console.log('  SUCCESS: Workout inserted successfully');
  } else {
    console.error(`  FAILED: ${result.error}`);
    process.exit(1);
  }
  console.log('');

  // Step 3: Verify
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
    console.error('  ERROR: Record NOT found after insert!');
    process.exit(1);
  }
  console.log('');

  // Step 4: Recalculate totals
  console.log('STEP 4: Recalculating Jose\'s deduplicated running total...');
  const updatedUrl = `${SUPABASE_URL}/rest/v1/workout_submissions?npub=eq.${JOSE_NPUB}&activity_type=eq.running&select=*&order=created_at.asc`;
  const updatedRunning = await fetchJson<WorkoutRow[]>(updatedUrl);

  const seen2 = new Map<string, WorkoutRow>();
  for (const w of updatedRunning) {
    const key = `${w.leaderboard_date}|${w.distance_meters}|${w.duration_seconds}`;
    if (!seen2.has(key)) {
      seen2.set(key, w);
    }
  }
  const updatedDeduped = Array.from(seen2.values());
  const newTotal = updatedDeduped.reduce((sum, w) => sum + (Number(w.distance_meters) || 0), 0);
  const newTotalKm = newTotal / 1000;

  console.log(`  Raw running submissions:   ${updatedRunning.length}`);
  console.log(`  Deduplicated running:      ${updatedDeduped.length}`);
  console.log(`  New deduplicated total:    ${newTotalKm.toFixed(2)} km`);
  console.log(`  Target:                    ${targetKm} km`);
  console.log(`  Difference from target:    ${(newTotalKm - targetKm).toFixed(2)} km`);
  console.log('');

  // List all deduplicated workouts
  console.log('  DEDUPLICATED RUNNING WORKOUTS:');
  console.log('-'.repeat(80));
  console.log('  #  | Date       | Dist (km) | Duration  | Source        | Event ID (first 20)');
  console.log('-'.repeat(80));

  updatedDeduped.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  for (let i = 0; i < updatedDeduped.length; i++) {
    const w = updatedDeduped[i];
    const dateStr = w.leaderboard_date || new Date(w.created_at).toISOString().split('T')[0];
    const distKm = metersToKm(Number(w.distance_meters)).padStart(9);
    const dur = formatDuration(Number(w.duration_seconds));
    const src = (w.source || 'null').padEnd(13);
    console.log(`  ${String(i + 1).padStart(2)} | ${dateStr} | ${distKm} | ${dur} | ${src} | ${w.event_id.slice(0, 20)}...`);
  }
  console.log('-'.repeat(80));

  console.log('');
  console.log('='.repeat(70));
  if (Math.abs(newTotalKm - targetKm) < 0.1) {
    console.log(`  SUCCESS: Jose now at ${newTotalKm.toFixed(2)} km (target: ${targetKm} km)`);
  } else {
    console.log(`  WARNING: Jose at ${newTotalKm.toFixed(2)} km, target was ${targetKm} km`);
  }
  console.log('='.repeat(70));

  process.exit(0);
}

main().catch(err => {
  console.error('Script error:', err);
  process.exit(1);
});
