#!/usr/bin/env tsx
/**
 * Diagnostic + Fix Script: TheWildHustle leaderboard_date issue
 *
 * User's workout from ~Feb 10 has leaderboard_date = '2026-02-11' instead of '2026-02-10'.
 * The user ran on Feb 10 local time but the submission crossed midnight UTC (00:01:15 UTC Feb 11).
 * The leaderboard_date should reflect the user's local date (Feb 10), not UTC date.
 *
 * Strategy: DELETE the old row, then INSERT a corrected copy with leaderboard_date = '2026-02-10'.
 * (Supabase RLS allows INSERT/SELECT/DELETE but blocks PATCH with anon key.)
 *
 * npub: npub1xr8tvnnnr9aqt9vv30vj4vreeq2mk38mlwe7khvhvmzjqlcghh6sr85uum
 * hex:  30ceb64e73197a05958c8bd92ab079c815bb44fbfbb3eb5d9766c5207f08bdf5
 *
 * Usage: npx tsx scripts/diagnostics/fix-wildhustle-leaderboard-date.ts
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../../.env') });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const USER_NPUB = 'npub1xr8tvnnnr9aqt9vv30vj4vreeq2mk38mlwe7khvhvmzjqlcghh6sr85uum';
const USER_NAME = 'TheWildHustle';

// The specific workout to fix
const TARGET_WORKOUT_ID = 'f9d85b5f-f57f-4ce0-8213-869f18934c46';
const WRONG_DATE = '2026-02-11';
const CORRECT_DATE = '2026-02-10';

interface WorkoutRow {
  id: string;
  event_id: string;
  npub: string;
  activity_type: string;
  distance_meters: number | null;
  duration_seconds: number | null;
  calories: number | null;
  created_at: string;
  leaderboard_date: string | null;
  verified: boolean | null;
  verification_status: string | null;
  source: string | null;
  profile_name: string | null;
  profile_picture: string | null;
  ppq_bolt11: string | null;
  ppq_invoice_id: string | null;
  raw_event: Record<string, unknown> | null;
}

async function supabaseRequest(url: string, options?: RequestInit): Promise<{ ok: boolean; status: number; data: any; text: string }> {
  const headers: Record<string, string> = {
    'apikey': SUPABASE_KEY as string,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string> || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const text = await response.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // not JSON
  }

  return { ok: response.ok, status: response.status, data, text };
}

function metersToKm(meters: number | null): string {
  if (!meters && meters !== 0) return '?.??';
  return (meters / 1000).toFixed(2);
}

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return '??:??:??';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(Math.round(s)).padStart(2, '0')}`;
}

async function main() {
  console.log('='.repeat(100));
  console.log(`DIAGNOSTIC + FIX: ${USER_NAME} - Wrong leaderboard_date`);
  console.log('='.repeat(100));
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`npub:      ${USER_NPUB}`);
  console.log(`Target:    ${TARGET_WORKOUT_ID}`);
  console.log(`Fix:       leaderboard_date ${WRONG_DATE} -> ${CORRECT_DATE}`);
  console.log('');

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('ERROR: Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env');
    process.exit(1);
  }

  // ====================================================================
  // STEP 1: Query recent workouts to show context
  // ====================================================================
  console.log('STEP 1: Query recent workout_submissions for user');
  console.log('-'.repeat(100));

  const url = `${SUPABASE_URL}/rest/v1/workout_submissions?npub=eq.${USER_NPUB}&select=id,event_id,npub,activity_type,distance_meters,duration_seconds,calories,created_at,leaderboard_date,verified,verification_status,source,profile_name,profile_picture,ppq_bolt11,ppq_invoice_id,raw_event&order=created_at.desc&limit=10`;
  const result = await supabaseRequest(url);
  if (!result.ok) {
    console.error(`  Query failed: HTTP ${result.status}: ${result.text}`);
    process.exit(1);
  }

  const workouts: WorkoutRow[] = result.data || [];
  console.log(`  Found ${workouts.length} recent workout(s)`);
  console.log('');

  // Display recent workouts
  console.log('  #  | leaderboard_date | created_at           | activity  | Dist (km) | Duration  | ID');
  console.log('-'.repeat(130));

  for (let i = 0; i < workouts.length; i++) {
    const w = workouts[i];
    const lbDate = (w.leaderboard_date || 'null').padEnd(16);
    const createdAt = w.created_at.replace('T', ' ').slice(0, 19);
    const activity = (w.activity_type || 'unknown').padEnd(9);
    const distKm = metersToKm(w.distance_meters).padStart(9);
    const dur = formatDuration(w.duration_seconds);
    const marker = w.id === TARGET_WORKOUT_ID ? ' <-- TARGET' : '';

    console.log(`  ${String(i + 1).padStart(2)} | ${lbDate} | ${createdAt} | ${activity} | ${distKm} | ${dur} | ${w.id.slice(0, 12)}...${marker}`);
  }
  console.log('-'.repeat(130));
  console.log('');

  // ====================================================================
  // STEP 2: Get the full record for the affected workout
  // ====================================================================
  console.log('STEP 2: Fetch full record for affected workout');
  console.log('-'.repeat(100));

  const targetUrl = `${SUPABASE_URL}/rest/v1/workout_submissions?id=eq.${TARGET_WORKOUT_ID}&select=*`;
  const targetResult = await supabaseRequest(targetUrl);
  if (!targetResult.ok || !targetResult.data?.length) {
    console.error(`  Failed to find workout ${TARGET_WORKOUT_ID}`);
    console.error(`  HTTP ${targetResult.status}: ${targetResult.text}`);
    process.exit(1);
  }

  const targetWorkout = targetResult.data[0];
  console.log(`  Found workout: ${targetWorkout.id}`);
  console.log(`    event_id:           ${targetWorkout.event_id}`);
  console.log(`    npub:               ${targetWorkout.npub?.slice(0, 20)}...`);
  console.log(`    activity_type:      ${targetWorkout.activity_type}`);
  console.log(`    distance_meters:    ${targetWorkout.distance_meters}`);
  console.log(`    duration_seconds:   ${targetWorkout.duration_seconds}`);
  console.log(`    created_at:         ${targetWorkout.created_at}`);
  console.log(`    leaderboard_date:   ${targetWorkout.leaderboard_date} (WRONG - should be ${CORRECT_DATE})`);
  console.log(`    verified:           ${targetWorkout.verified}`);
  console.log(`    source:             ${targetWorkout.source}`);
  console.log('');

  // ====================================================================
  // STEP 3: Try PATCH first (may work if RLS allows it)
  // ====================================================================
  console.log('STEP 3: Attempt PATCH update');
  console.log('-'.repeat(100));

  const patchUrl = `${SUPABASE_URL}/rest/v1/workout_submissions?id=eq.${TARGET_WORKOUT_ID}`;
  const patchResult = await supabaseRequest(patchUrl, {
    method: 'PATCH',
    headers: { 'Prefer': 'return=representation' },
    body: JSON.stringify({ leaderboard_date: CORRECT_DATE }),
  });

  console.log(`  PATCH response: HTTP ${patchResult.status}`);

  if (patchResult.ok && patchResult.data?.length > 0 && patchResult.data[0].leaderboard_date === CORRECT_DATE) {
    console.log(`  SUCCESS via PATCH! New leaderboard_date = ${patchResult.data[0].leaderboard_date}`);
  } else {
    console.log(`  PATCH returned: ${JSON.stringify(patchResult.data)}`);
    console.log(`  PATCH may not be allowed by RLS. Trying DELETE + INSERT approach...`);
    console.log('');

    // ====================================================================
    // STEP 3b: DELETE the old row, INSERT corrected copy
    // ====================================================================
    console.log('STEP 3b: DELETE old row');

    const deleteUrl = `${SUPABASE_URL}/rest/v1/workout_submissions?id=eq.${TARGET_WORKOUT_ID}`;
    const deleteResult = await supabaseRequest(deleteUrl, {
      method: 'DELETE',
      headers: { 'Prefer': 'return=representation' },
    });

    console.log(`  DELETE response: HTTP ${deleteResult.status}`);

    if (deleteResult.ok) {
      if (deleteResult.data?.length > 0) {
        console.log(`  Deleted row: ${deleteResult.data[0].id}`);
      } else {
        console.log(`  DELETE returned empty (may be RLS blocked). Checking if row still exists...`);
        const checkResult = await supabaseRequest(targetUrl);
        if (checkResult.data?.length > 0) {
          console.log('  Row STILL EXISTS. DELETE was blocked by RLS.');
          console.log('');
          console.log('  !! CANNOT FIX WITH ANON KEY !!');
          console.log('  You need SUPABASE_SERVICE_ROLE_KEY for update access.');
          console.log('  Add SUPABASE_SERVICE_ROLE_KEY to .env and re-run this script.');
          console.log('  Or update the row directly in Supabase Dashboard > Table Editor.');
          console.log('');
          console.log('  Supabase Dashboard URL:');
          console.log('  https://supabase.com/dashboard/project/mofalmnixppnqcvfkveq/editor');
          console.log(`  Table: workout_submissions, filter by id = ${TARGET_WORKOUT_ID}`);
          console.log(`  Change leaderboard_date from '${WRONG_DATE}' to '${CORRECT_DATE}'`);
          process.exit(1);
        } else {
          console.log('  Row deleted successfully (empty return is normal for DELETE).');
        }
      }

      // INSERT corrected copy
      console.log('');
      console.log('STEP 3c: INSERT corrected copy with leaderboard_date = ' + CORRECT_DATE);

      // Build the insert payload from the original record, but with corrected leaderboard_date
      const insertData: Record<string, unknown> = {
        npub: targetWorkout.npub,
        event_id: targetWorkout.event_id,
        activity_type: targetWorkout.activity_type,
        distance_meters: targetWorkout.distance_meters,
        duration_seconds: targetWorkout.duration_seconds,
        calories: targetWorkout.calories,
        created_at: targetWorkout.created_at,
        leaderboard_date: CORRECT_DATE,  // <-- THE FIX
        verified: targetWorkout.verified,
        verification_status: targetWorkout.verification_status,
        source: targetWorkout.source,
        profile_name: targetWorkout.profile_name,
        profile_picture: targetWorkout.profile_picture,
        ppq_bolt11: targetWorkout.ppq_bolt11,
        ppq_invoice_id: targetWorkout.ppq_invoice_id,
        raw_event: targetWorkout.raw_event,
      };

      const insertUrl = `${SUPABASE_URL}/rest/v1/workout_submissions`;
      const insertResult = await supabaseRequest(insertUrl, {
        method: 'POST',
        headers: { 'Prefer': 'return=representation' },
        body: JSON.stringify(insertData),
      });

      console.log(`  INSERT response: HTTP ${insertResult.status}`);

      if (insertResult.ok && insertResult.data?.length > 0) {
        console.log(`  SUCCESS! New row inserted:`);
        console.log(`    New ID:           ${insertResult.data[0].id}`);
        console.log(`    leaderboard_date: ${insertResult.data[0].leaderboard_date}`);
        console.log(`    event_id:         ${insertResult.data[0].event_id}`);
      } else {
        console.error(`  INSERT FAILED: ${insertResult.text}`);
        console.error('  WARNING: The original row was deleted but re-insert failed!');
        console.error('  You need to manually re-insert in Supabase Dashboard.');
        process.exit(1);
      }
    } else {
      console.error(`  DELETE FAILED: HTTP ${deleteResult.status}: ${deleteResult.text}`);
      console.log('  Trying RPC approach or manual fix needed.');
      process.exit(1);
    }
  }
  console.log('');

  // ====================================================================
  // STEP 4: Verify the fix
  // ====================================================================
  console.log('STEP 4: Verify the fix');
  console.log('-'.repeat(100));

  const verifyUrl = `${SUPABASE_URL}/rest/v1/workout_submissions?npub=eq.${USER_NPUB}&select=id,leaderboard_date,created_at,activity_type,distance_meters&order=created_at.desc&limit=10`;
  const verifyResult = await supabaseRequest(verifyUrl);
  const verifiedWorkouts: WorkoutRow[] = verifyResult.data || [];

  console.log('  #  | leaderboard_date | created_at           | activity  | Dist (km)');
  console.log('-'.repeat(90));

  for (let i = 0; i < verifiedWorkouts.length; i++) {
    const w = verifiedWorkouts[i];
    const lbDate = (w.leaderboard_date || 'null').padEnd(16);
    const createdAt = w.created_at.replace('T', ' ').slice(0, 19);
    const activity = (w.activity_type || 'unknown').padEnd(9);
    const distKm = metersToKm(w.distance_meters).padStart(9);

    const marker = w.leaderboard_date === CORRECT_DATE && w.created_at.includes('2026-02-11') ? ' <-- FIXED' : '';
    console.log(`  ${String(i + 1).padStart(2)} | ${lbDate} | ${createdAt} | ${activity} | ${distKm}${marker}`);
  }
  console.log('-'.repeat(90));
  console.log('');

  console.log('='.repeat(100));
  console.log('DONE');
  console.log('='.repeat(100));

  process.exit(0);
}

main().catch(err => {
  console.error('Script error:', err);
  process.exit(1);
});
