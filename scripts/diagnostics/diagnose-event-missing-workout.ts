/**
 * Diagnostic: Why is my workout missing from a club event?
 *
 * Checks the three possible causes:
 * 1. User not in competition_participants
 * 2. Activity type mismatch
 * 3. Date range mismatch (created_at vs competition dates)
 *
 * Usage: npx tsx scripts/diagnostics/diagnose-event-missing-workout.ts
 */

const SUPABASE_URL = 'https://mofalmnixppnqcvfkveq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vZmFsbW5peHBwbnFjdmZrdmVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NzM4NDcsImV4cCI6MjA4NDE0OTg0N30.BsDKT7qqs7S69BDfIPJvWy5odshx2zKvEfb_sLc7RnA';

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

async function query(table: string, params: string): Promise<any> {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${params}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`${table} query failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function main() {
  console.log('=== DIAGNOSE: Missing Workout from Club Event ===\n');

  // Step 1: Find the "Another snow run" competition
  console.log('--- Step 1: Finding competition ---');
  const competitions = await query('competitions', 'select=id,external_id,name,activity_type,scoring_method,start_date,end_date,club_id,config,created_by_npub&order=created_at.desc&limit=20');

  const snowRun = competitions.find((c: any) =>
    c.name?.toLowerCase().includes('snow')
  );

  if (!snowRun) {
    console.log('\nRecent competitions:');
    competitions.forEach((c: any) => {
      console.log(`  - "${c.name}" (${c.external_id || c.id}) | type: ${c.activity_type} | ${c.start_date} to ${c.end_date}`);
    });
    console.log('\n❌ Could not find "Another snow run". Check names above.');
    return;
  }

  const compId = snowRun.id;
  const configTypes = (snowRun.config as any)?.activity_types;
  const expectedTypes = configTypes && configTypes.length > 0
    ? configTypes
    : [snowRun.activity_type];

  console.log(`✅ Found: "${snowRun.name}"`);
  console.log(`   ID: ${compId}`);
  console.log(`   External ID: ${snowRun.external_id || 'none'}`);
  console.log(`   Activity type: ${snowRun.activity_type}`);
  console.log(`   Config activity_types: ${JSON.stringify(configTypes || 'none')}`);
  console.log(`   Effective types filter: ${JSON.stringify(expectedTypes)}`);
  console.log(`   Scoring: ${snowRun.scoring_method}`);
  console.log(`   Date range: ${snowRun.start_date} → ${snowRun.end_date}`);
  console.log(`   Club ID: ${snowRun.club_id || 'none'}`);
  console.log(`   Created by: ${snowRun.created_by_npub?.slice(0, 20)}...`);

  const captainNpub = snowRun.created_by_npub;

  // Step 2: Check competition_participants
  console.log('\n--- Step 2: Checking competition_participants ---');
  const participants = await query('competition_participants', `select=npub,created_at&competition_id=eq.${compId}&order=created_at.asc`);

  console.log(`Total participants: ${participants.length}`);
  participants.forEach((p: any) => {
    const isCaptain = p.npub === captainNpub;
    console.log(`  ${isCaptain ? '👑' : '  '} ${p.npub.slice(0, 20)}... joined ${p.created_at} ${isCaptain ? '← CAPTAIN' : ''}`);
  });

  const captainIsParticipant = participants.some((p: any) => p.npub === captainNpub);
  if (!captainIsParticipant) {
    console.log(`\n🚨 BUG FOUND: Captain ${captainNpub?.slice(0, 20)}... is NOT in competition_participants!`);
    console.log(`   This is why their workout doesn't show up.`);
    console.log(`   The auto-join Edge Function did not include the captain.`);
  } else {
    console.log(`\n✅ Captain IS in competition_participants`);
  }

  // Step 3: Check club_memberships for captain
  if (snowRun.club_id) {
    console.log('\n--- Step 3: Checking club_memberships ---');
    const members = await query('club_memberships', `select=member_npub,role,joined_at&club_id=eq.${snowRun.club_id}&order=joined_at.asc`);

    console.log(`Club members: ${members.length}`);
    members.forEach((m: any) => {
      const isCaptain = m.member_npub === captainNpub;
      console.log(`  ${m.role === 'captain' ? '👑' : '  '} ${m.member_npub.slice(0, 20)}... role=${m.role} ${isCaptain ? '← EVENT CREATOR' : ''}`);
    });

    const captainInClub = members.some((m: any) => m.member_npub === captainNpub);
    if (!captainInClub) {
      console.log(`\n🚨 Captain is NOT in club_memberships! This explains why auto-join skipped them.`);
    }
  }

  // Step 4: Check captain's recent workouts in workout_submissions
  console.log('\n--- Step 4: Checking captain\'s workouts ---');
  if (!captainNpub) {
    console.log('❌ No created_by_npub on competition, cannot look up captain workouts');
    return;
  }

  const today = new Date().toISOString().split('T')[0];
  const workouts = await query('workout_submissions',
    `select=id,npub,activity_type,distance_meters,duration_seconds,created_at,leaderboard_date,source&npub=eq.${encodeURIComponent(captainNpub)}&order=created_at.desc&limit=10`
  );

  console.log(`Captain's recent workouts: ${workouts.length}`);
  workouts.forEach((w: any) => {
    const inDateRange =
      w.created_at >= snowRun.start_date && w.created_at <= snowRun.end_date;
    const typeMatch = expectedTypes.map((t: string) => t.toLowerCase()).includes(w.activity_type?.toLowerCase());

    console.log(`  Workout ${w.id?.slice(0, 8)}...`);
    console.log(`    activity_type: "${w.activity_type}" ${typeMatch ? '✅ matches event' : `❌ MISMATCH (event expects ${JSON.stringify(expectedTypes)})`}`);
    console.log(`    distance: ${w.distance_meters}m, duration: ${w.duration_seconds}s`);
    console.log(`    created_at: ${w.created_at} ${inDateRange ? '✅ in range' : '❌ OUTSIDE event date range'}`);
    console.log(`    leaderboard_date: ${w.leaderboard_date} (daily leaderboard uses this)`);
    console.log(`    source: ${w.source}`);
  });

  // Step 5: Check the other user's workout that IS showing (for comparison)
  console.log('\n--- Step 5: Comparison - other participants\' workouts ---');
  const otherNpubs = participants
    .filter((p: any) => p.npub !== captainNpub)
    .map((p: any) => p.npub);

  if (otherNpubs.length > 0) {
    // Check first other participant
    const otherNpub = otherNpubs[0];
    const otherWorkouts = await query('workout_submissions',
      `select=id,npub,activity_type,distance_meters,duration_seconds,created_at,leaderboard_date,source&npub=eq.${encodeURIComponent(otherNpub)}&created_at=gte.${snowRun.start_date}&created_at=lte.${snowRun.end_date}&limit=5`
    );

    console.log(`Other participant ${otherNpub.slice(0, 20)}... workouts in date range: ${otherWorkouts.length}`);
    otherWorkouts.forEach((w: any) => {
      console.log(`  activity_type: "${w.activity_type}", distance: ${w.distance_meters}m, created_at: ${w.created_at}`);
    });
  }

  // Step 6: Summary
  console.log('\n=== DIAGNOSIS SUMMARY ===\n');

  if (!captainIsParticipant) {
    console.log('🔴 ROOT CAUSE: Captain is NOT in competition_participants.');
    console.log('   The getLeaderboard() query filters workouts by participants first.');
    console.log('   Since the captain is not a participant, their workout is invisible.\n');
    console.log('   FIX OPTIONS:');
    console.log('   1. Manual: Insert captain into competition_participants via Supabase dashboard');
    console.log('   2. Code: Ensure auto-join includes the event creator');
    console.log('   3. Code: Captain should be auto-joined when they create an event');
  } else {
    // Captain is a participant — check other causes
    const captainWorkout = workouts[0]; // Most recent
    if (captainWorkout) {
      const typeMatch = expectedTypes.map((t: string) => t.toLowerCase()).includes(captainWorkout.activity_type?.toLowerCase());
      const inRange = captainWorkout.created_at >= snowRun.start_date && captainWorkout.created_at <= snowRun.end_date;

      if (!typeMatch) {
        console.log(`🔴 ROOT CAUSE: Activity type mismatch.`);
        console.log(`   Workout type: "${captainWorkout.activity_type}"`);
        console.log(`   Event expects: ${JSON.stringify(expectedTypes)}`);
        console.log(`\n   FIX: The event only accepts ${expectedTypes.join('/')} workouts.`);
        console.log(`   Your workout was logged as "${captainWorkout.activity_type}".`);
      } else if (!inRange) {
        console.log(`🔴 ROOT CAUSE: Date range mismatch.`);
        console.log(`   Workout created_at: ${captainWorkout.created_at}`);
        console.log(`   Event range: ${snowRun.start_date} → ${snowRun.end_date}`);
        console.log(`\n   The event query uses created_at, not leaderboard_date.`);
        console.log(`   Your workout was submitted outside the event's date window.`);
      } else {
        console.log('🟡 All filters look correct. Possible issues:');
        console.log('   - npub format mismatch (hex vs npub1...)');
        console.log('   - Banned users filter excluding you');
        console.log('   - Cache showing stale data (wait 5 min or force refresh)');
      }
    } else {
      console.log('🔴 No recent workouts found for captain in workout_submissions.');
    }
  }
}

main().catch(console.error);
