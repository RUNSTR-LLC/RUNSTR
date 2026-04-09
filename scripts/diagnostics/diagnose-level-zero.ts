/**
 * Diagnose why profile shows Level 1 / 0 XP
 * Tests the exact same query path as ProfileDataService.getLevelData()
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function diagnose() {
  // Step 1: Check if we can query workout_submissions at all
  console.log('=== Step 1: Basic query test ===');
  const { data: countData, error: countError } = await supabase
    .from('workout_submissions')
    .select('id', { count: 'exact', head: true });

  if (countError) {
    console.error('Cannot query workout_submissions:', countError.message);
    console.error('Full error:', JSON.stringify(countError));
    return;
  }
  console.log('Query works. Checking specific user...\n');

  // Step 2: Get Dakota's npub from a recent submission
  console.log('=== Step 2: Find recent submissions ===');
  const { data: recent, error: recentErr } = await supabase
    .from('workout_submissions')
    .select('npub, activity_type, distance_meters, duration_seconds, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  if (recentErr) {
    console.error('Recent query error:', recentErr.message);
    return;
  }

  if (!recent || recent.length === 0) {
    console.log('No workout submissions found in the database at all!');
    return;
  }

  console.log('Recent submissions:');
  recent.forEach((w, i) => {
    console.log(`  ${i + 1}. npub=${w.npub?.slice(0, 20)}... type=${w.activity_type} dist=${w.distance_meters}m dur=${w.duration_seconds}s date=${w.created_at}`);
  });

  // Step 3: Query with the npub from step 2
  const testNpub = recent[0].npub;
  console.log(`\n=== Step 3: Query for npub ${testNpub?.slice(0, 20)}... ===`);

  const { data: userWorkouts, error: userErr } = await supabase
    .from('workout_submissions')
    .select('id, activity_type, distance_meters, duration_seconds, created_at')
    .eq('npub', testNpub)
    .order('created_at', { ascending: false })
    .limit(1000);

  if (userErr) {
    console.error('User query error:', userErr.message);
    return;
  }

  console.log(`Found ${userWorkouts?.length || 0} workouts for this user`);

  if (userWorkouts && userWorkouts.length > 0) {
    // Step 4: Calculate level
    const XP_PER_WORKOUT = 300;
    const XP_PER_LEVEL = 500;
    const totalXP = userWorkouts.length * XP_PER_WORKOUT;
    const level = Math.floor(totalXP / XP_PER_LEVEL);
    console.log(`\n=== Step 4: Level Calculation ===`);
    console.log(`  Workouts: ${userWorkouts.length}`);
    console.log(`  Total XP: ${totalXP} (${userWorkouts.length} x ${XP_PER_WORKOUT})`);
    console.log(`  Level: ${level}`);
    console.log(`  Progress: ${totalXP - (level * XP_PER_LEVEL)} / ${XP_PER_LEVEL}`);
  }

  // Step 5: Check if npub format matches
  console.log(`\n=== Step 5: npub format check ===`);
  console.log(`  npub starts with 'npub1': ${testNpub?.startsWith('npub1')}`);
  console.log(`  npub length: ${testNpub?.length}`);

  // Step 6: Check for different npub formats in the table
  const { data: distinctNpubs, error: distinctErr } = await supabase
    .from('workout_submissions')
    .select('npub')
    .limit(20);

  if (!distinctErr && distinctNpubs) {
    const formats = new Set(distinctNpubs.map(d => {
      if (d.npub?.startsWith('npub1')) return 'npub1...';
      if (d.npub?.length === 64) return 'hex (64 chars)';
      return `other (${d.npub?.length} chars)`;
    }));
    console.log(`  Formats found in table: ${[...formats].join(', ')}`);
  }
}

diagnose().catch(console.error);
