/**
 * Diagnostic: Check thewildhustle's latest workout and why it's not on leaderboards
 */

const SUPABASE_URL = 'https://mofalmnixppnqcvfkveq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vZmFsbW5peHBwbnFjdmZrdmVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NzM4NDcsImV4cCI6MjA4NDE0OTg0N30.BsDKT7qqs7S69BDfIPJvWy5odshx2zKvEfb_sLc7RnA';

// Two possible npubs for the user
const NPUB_FUNDING = 'npub1vygzr642y6f8gxcjx6auaf2vd25lyzarpjkwx9kr4y752zy6058s8jvy4e';
const NPUB_SNOW_CREATOR = 'npub1xr8tvnnnr9aqt9vv30vj4vreeq2mk38mlwe7khvhvmzjqlcghh6sr85uum';
const SNOW_RUN_ID = '94ab88e9-725c-415e-8345-d2e239d034b1';

async function query(table: string, params: string) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${params}`;
  const res = await fetch(url, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
  });
  const data = await res.json();
  return { data, status: res.status };
}

async function checkNpub(npub: string, label: string) {
  console.log(`\n=== Checking ${label}: ${npub.substring(0, 20)}... ===\n`);

  // Latest workouts
  const { data: workouts } = await query(
    'workout_submissions',
    `npub=eq.${npub}&order=created_at.desc&limit=5&select=id,npub,activity_type,distance_meters,duration_seconds,source,leaderboard_date,created_at,profile_name,profile_picture,time_5k_seconds,time_10k_seconds,ppq_bolt11,ppq_invoice_id`
  );

  if (!Array.isArray(workouts) || workouts.length === 0) {
    console.log('❌ No workout submissions found');
  } else {
    console.log(`✅ Found ${workouts.length} recent workouts:`);
    for (const w of workouts) {
      console.log(`\n  📋 ID: ${w.id}`);
      console.log(`     Activity: ${w.activity_type}`);
      console.log(`     Distance: ${(w.distance_meters / 1000).toFixed(2)} km`);
      console.log(`     Duration: ${Math.floor(w.duration_seconds / 60)}m ${w.duration_seconds % 60}s`);
      console.log(`     Source: ${w.source}`);
      console.log(`     Leaderboard Date: ${w.leaderboard_date}`);
      console.log(`     Created At: ${w.created_at}`);
      console.log(`     Profile: ${w.profile_name || '(none)'} | Pic: ${w.profile_picture ? 'YES' : 'none'}`);
      console.log(`     5K time: ${w.time_5k_seconds ?? 'NULL'} | 10K time: ${w.time_10k_seconds ?? 'NULL'}`);
      console.log(`     PPQ: bolt11=${w.ppq_bolt11 ? 'YES' : 'none'} | invoice=${w.ppq_invoice_id || 'none'}`);
    }
  }

  // Check if participant in Snow Run
  const { data: participation } = await query(
    'competition_participants',
    `competition_id=eq.${SNOW_RUN_ID}&npub=eq.${npub}&select=id,npub,name,picture,joined_at`
  );

  if (!Array.isArray(participation) || participation.length === 0) {
    console.log(`\n❌ NOT a participant in Snow Run`);
  } else {
    console.log(`\n✅ IS a participant in Snow Run:`);
    for (const p of participation) {
      console.log(`   Name: ${p.name || '(none)'} | Pic: ${p.picture ? 'YES' : 'none'} | Joined: ${p.joined_at}`);
    }
  }

  // Check flagged
  const { data: flagged } = await query(
    'flagged_workouts',
    `npub=eq.${npub}&order=created_at.desc&limit=3&select=id,reason,created_at,activity_type,distance_meters`
  );

  if (Array.isArray(flagged) && flagged.length > 0) {
    console.log(`\n⚠️  ${flagged.length} flagged workouts:`);
    for (const f of flagged) {
      console.log(`   🚫 ${f.activity_type} | ${(f.distance_meters / 1000).toFixed(2)}km | ${f.created_at} | ${f.reason}`);
    }
  } else {
    console.log(`\n✅ No flagged workouts`);
  }
}

async function main() {
  console.log('=== DIAGNOSTIC: thewildhustle workout check ===');
  console.log(`Date: ${new Date().toISOString()}\n`);

  // Check Snow Run competition details
  console.log('--- Snow Run Competition Details ---');
  const { data: comp } = await query(
    'competitions',
    `id=eq.${SNOW_RUN_ID}&select=id,external_id,name,activity_type,scoring_method,start_date,end_date,is_open,config,created_by_npub,image_url`
  );
  if (Array.isArray(comp) && comp.length > 0) {
    const c = comp[0];
    console.log(`Name: ${c.name}`);
    console.log(`Dates: ${c.start_date} - ${c.end_date}`);
    console.log(`Activity: ${c.activity_type} | Scoring: ${c.scoring_method}`);
    console.log(`Config: ${JSON.stringify(c.config)}`);
    console.log(`Created by: ${c.created_by_npub}`);
    console.log(`Is open: ${c.is_open}`);
    console.log(`Image URL: ${c.image_url || '(none)'}`);

    // All participants
    const { data: allParts } = await query(
      'competition_participants',
      `competition_id=eq.${SNOW_RUN_ID}&select=id,npub,name,picture,joined_at`
    );
    if (Array.isArray(allParts)) {
      console.log(`\nAll participants (${allParts.length}):`);
      for (const p of allParts) {
        console.log(`  ${p.npub.substring(0, 20)}... | name: ${p.name || '(none)'} | pic: ${p.picture ? 'YES' : 'none'}`);
      }
    }
  }

  // Check both npubs
  await checkNpub(NPUB_FUNDING, 'FUNDING.yml npub');
  await checkNpub(NPUB_SNOW_CREATOR, 'Snow Run creator npub');

  // Also search by profile name "thewildhustle" or "Dakota"
  console.log('\n\n--- Search by profile name ---');
  const { data: byName } = await query(
    'workout_submissions',
    `profile_name=ilike.*wild*&order=created_at.desc&limit=5&select=npub,profile_name,activity_type,distance_meters,created_at,leaderboard_date,source`
  );
  if (Array.isArray(byName) && byName.length > 0) {
    console.log(`Found ${byName.length} workouts with "wild" in profile_name:`);
    for (const w of byName) {
      console.log(`  ${w.profile_name} | ${w.npub.substring(0, 20)}... | ${w.activity_type} | ${(w.distance_meters / 1000).toFixed(2)}km | ${w.created_at}`);
    }
  } else {
    console.log('No workouts with "wild" in profile name');
  }

  const { data: byDakota } = await query(
    'workout_submissions',
    `profile_name=ilike.*dakota*&order=created_at.desc&limit=5&select=npub,profile_name,activity_type,distance_meters,created_at,leaderboard_date,source`
  );
  if (Array.isArray(byDakota) && byDakota.length > 0) {
    console.log(`\nFound ${byDakota.length} workouts with "dakota" in profile_name:`);
    for (const w of byDakota) {
      console.log(`  ${w.profile_name} | ${w.npub.substring(0, 20)}... | ${w.activity_type} | ${(w.distance_meters / 1000).toFixed(2)}km | ${w.created_at}`);
    }
  } else {
    console.log('No workouts with "dakota" in profile name');
  }

  console.log('\n\n=== DIAGNOSTIC COMPLETE ===');
}

main().catch(console.error);
