#!/usr/bin/env tsx
/**
 * Fix Script v2: TheWildHustle leaderboard_date issue
 *
 * Uses @supabase/supabase-js client library (instead of raw REST)
 * to attempt the update, which may handle RLS differently.
 *
 * If the anon key still doesn't work, falls back to instructions
 * for using the service role key or Supabase Dashboard.
 *
 * Usage: npx tsx scripts/diagnostics/fix-wildhustle-leaderboard-date-v2.ts
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: resolve(__dirname, '../../.env') });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const KEY_TYPE = process.env.SUPABASE_SERVICE_ROLE_KEY ? 'service_role' : 'anon';

const USER_NPUB = 'npub1xr8tvnnnr9aqt9vv30vj4vreeq2mk38mlwe7khvhvmzjqlcghh6sr85uum';
const TARGET_WORKOUT_ID = 'f9d85b5f-f57f-4ce0-8213-869f18934c46';
const WRONG_DATE = '2026-02-11';
const CORRECT_DATE = '2026-02-10';

async function main() {
  console.log('='.repeat(80));
  console.log('FIX: TheWildHustle leaderboard_date 2026-02-11 -> 2026-02-10');
  console.log('='.repeat(80));
  console.log(`Using key type: ${KEY_TYPE}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log('');

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('ERROR: Missing Supabase credentials in .env');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Step 1: Verify the workout exists and has wrong date
  console.log('Step 1: Verify target workout');
  const { data: before, error: beforeError } = await supabase
    .from('workout_submissions')
    .select('id, leaderboard_date, created_at, activity_type, distance_meters')
    .eq('id', TARGET_WORKOUT_ID)
    .single();

  if (beforeError || !before) {
    console.error('  ERROR: Could not find workout:', beforeError?.message);
    process.exit(1);
  }

  console.log(`  ID:               ${before.id}`);
  console.log(`  leaderboard_date: ${before.leaderboard_date}`);
  console.log(`  created_at:       ${before.created_at}`);
  console.log(`  activity_type:    ${before.activity_type}`);
  console.log(`  distance:         ${((before.distance_meters || 0) / 1000).toFixed(2)} km`);
  console.log('');

  if (before.leaderboard_date === CORRECT_DATE) {
    console.log('  Already fixed! leaderboard_date is already ' + CORRECT_DATE);
    process.exit(0);
  }

  if (before.leaderboard_date !== WRONG_DATE) {
    console.log(`  Unexpected leaderboard_date: ${before.leaderboard_date} (expected ${WRONG_DATE})`);
    console.log('  Aborting to avoid wrong update.');
    process.exit(1);
  }

  // Step 2: Attempt the update
  console.log('Step 2: Update leaderboard_date');
  console.log(`  FROM: ${WRONG_DATE}`);
  console.log(`  TO:   ${CORRECT_DATE}`);

  const { data: updated, error: updateError } = await supabase
    .from('workout_submissions')
    .update({ leaderboard_date: CORRECT_DATE })
    .eq('id', TARGET_WORKOUT_ID)
    .select('id, leaderboard_date');

  if (updateError) {
    console.error(`  UPDATE ERROR: ${updateError.message}`);
    console.error(`  Code: ${updateError.code}, Details: ${updateError.details}`);
  }

  if (updated && updated.length > 0) {
    console.log(`  SUCCESS! Updated leaderboard_date = ${updated[0].leaderboard_date}`);
  } else {
    console.log(`  Update returned no rows (RLS may block updates with ${KEY_TYPE} key).`);
    console.log('');

    if (KEY_TYPE === 'anon') {
      console.log('  TO FIX: Add SUPABASE_SERVICE_ROLE_KEY to .env and re-run:');
      console.log('');
      console.log('  1. Go to: https://supabase.com/dashboard/project/mofalmnixppnqcvfkveq/settings/api');
      console.log('  2. Copy the "service_role" key (NOT the anon key)');
      console.log('  3. Add to .env: SUPABASE_SERVICE_ROLE_KEY=<paste key here>');
      console.log('  4. Re-run: npx tsx scripts/diagnostics/fix-wildhustle-leaderboard-date-v2.ts');
      console.log('');
      console.log('  OR fix directly in Supabase Dashboard:');
      console.log('  1. Go to: https://supabase.com/dashboard/project/mofalmnixppnqcvfkveq/editor');
      console.log('  2. Open "workout_submissions" table');
      console.log(`  3. Filter: id = ${TARGET_WORKOUT_ID}`);
      console.log(`  4. Change leaderboard_date from '${WRONG_DATE}' to '${CORRECT_DATE}'`);
    }
    process.exit(1);
  }

  // Step 3: Verify the fix
  console.log('');
  console.log('Step 3: Verify the fix');

  const { data: after, error: afterError } = await supabase
    .from('workout_submissions')
    .select('id, leaderboard_date, created_at, activity_type, distance_meters')
    .eq('id', TARGET_WORKOUT_ID)
    .single();

  if (after) {
    console.log(`  leaderboard_date: ${after.leaderboard_date} ${after.leaderboard_date === CORRECT_DATE ? '(CORRECT)' : '(STILL WRONG!)'}`);
  } else {
    console.log(`  Verification query error: ${afterError?.message}`);
  }

  // Show nearby workouts for context
  console.log('');
  console.log('Step 4: Recent workouts for context');

  const { data: recent } = await supabase
    .from('workout_submissions')
    .select('id, leaderboard_date, created_at, activity_type, distance_meters')
    .eq('npub', USER_NPUB)
    .order('created_at', { ascending: false })
    .limit(5);

  if (recent) {
    for (const w of recent) {
      const dist = ((w.distance_meters || 0) / 1000).toFixed(2);
      const marker = w.id === TARGET_WORKOUT_ID ? ' <-- FIXED' : '';
      console.log(`  ${w.leaderboard_date} | ${w.created_at?.slice(0, 19)} | ${w.activity_type} | ${dist} km${marker}`);
    }
  }

  console.log('');
  console.log('='.repeat(80));
  console.log('DONE');
  console.log('='.repeat(80));

  process.exit(0);
}

main().catch(err => {
  console.error('Script error:', err);
  process.exit(1);
});
