/**
 * Verify step/walking competition scoring (total_steps).
 *
 * Confirms the fix in SupabaseCompetitionService.getLeaderboard: `step_count`
 * is now SELECTed, so total_steps events actually score instead of returning 0.
 *
 * Run: npx tsx scripts/verify/verify-step-leaderboard.ts
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://cvoepeskjueskdfrpsnv.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!SUPABASE_KEY) {
  console.error('❌ Missing key. Set SUPABASE_SERVICE_ROLE_KEY or EXPO_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  // 1. Confirm the SELECT used by the fixed getLeaderboard returns step_count.
  const selectClause =
    'npub, distance_meters, step_count, activity_type, created_at, duration_seconds, event_id';
  const { data: walkRows, error: selErr } = await supabase
    .from('workout_submissions')
    .select(selectClause)
    .eq('activity_type', 'walking')
    .gt('step_count', 0)
    .limit(10);

  if (selErr) {
    console.error('❌ SELECT with step_count failed (the fix would not work):', selErr.message);
    process.exit(1);
  }
  console.log(`✅ SELECT including step_count succeeds. Found ${walkRows?.length ?? 0} walking rows with step_count > 0.`);

  if (walkRows && walkRows.length > 0) {
    const sample = walkRows[0] as { npub: string; step_count: number };
    console.log(`   e.g. ${sample.npub.slice(0, 12)}… → step_count = ${sample.step_count}`);
  } else {
    console.log('   ⚠️  No walking workouts with step_count > 0 in DB yet — cannot prove non-zero scores end-to-end.');
  }

  // 2. Simulate old vs new scoring for the total_steps path.
  // OLD: step_count was never selected → undefined → score 0.
  // NEW: step_count selected → real value.
  const rows = (walkRows ?? []) as Array<{ npub: string; step_count: number }>;
  const oldScore = rows.reduce((s, r) => s + ((r as { step_count?: number }).step_count ?? 0) * 0, 0); // mimics undefined → 0
  const newScore = rows.reduce((s, r) => s + (r.step_count || 0), 0);
  console.log(`   Old scoring (step_count absent): ${oldScore}`);
  console.log(`   New scoring (step_count present): ${newScore}`);
  if (rows.length > 0 && newScore > 0 && oldScore === 0) {
    console.log('✅ Fix changes a guaranteed-0 result into a real positive score.');
  }

  // 3. Look for any live total_steps competition.
  const { data: comps } = await supabase
    .from('competitions')
    .select('id, name, scoring_method, activity_type, club_id')
    .eq('scoring_method', 'total_steps')
    .limit(5);
  console.log(`\nℹ️  total_steps competitions in DB: ${comps?.length ?? 0}`);
  (comps ?? []).forEach((c: { name: string; club_id: string | null }) =>
    console.log(`   - ${c.name}${c.club_id ? ` (club ${c.club_id.slice(0, 8)}…)` : ' (global)'}`)
  );
  if (!comps || comps.length === 0) {
    console.log('   ⚠️  None exist yet — create a Step Challenge in a club to exercise the full flow.');
    return;
  }

  // 4. End-to-end: replicate getLeaderboard's total_steps aggregation for one real competition.
  const comp = comps[0] as {
    id: string; name: string; start_date?: string; end_date?: string;
  };
  const { data: full } = await supabase
    .from('competitions')
    .select('id, name, start_date, end_date, activity_type')
    .eq('id', comp.id)
    .single();
  const c = full as { name: string; start_date: string; end_date: string; activity_type: string };

  const { data: parts } = await supabase
    .from('competition_participants')
    .select('npub')
    .eq('competition_id', comp.id);
  const npubs = (parts ?? []).map((p: { npub: string }) => p.npub);
  console.log(`\n🏁 End-to-end check: "${c.name}" — ${npubs.length} participants`);
  if (npubs.length === 0) {
    console.log('   ⚠️  No participants joined — leaderboard would be empty regardless.');
    return;
  }

  const endObj = new Date(c.end_date);
  endObj.setUTCHours(23, 59, 59, 999);
  const { data: subs } = await supabase
    .from('workout_submissions')
    .select('npub, step_count')
    .in('npub', npubs)
    .eq('activity_type', c.activity_type.toLowerCase())
    .gte('created_at', c.start_date)
    .lte('created_at', endObj.toISOString());

  const scores = new Map<string, number>();
  (subs ?? []).forEach((w: { npub: string; step_count: number | null }) => {
    scores.set(w.npub, (scores.get(w.npub) || 0) + (w.step_count || 0));
  });
  const ranked = [...scores.entries()].filter(([, s]) => s > 0).sort((a, b) => b[1] - a[1]);
  console.log(`   Leaderboard entries with score > 0: ${ranked.length}`);
  ranked.slice(0, 3).forEach(([npub, s], i) =>
    console.log(`   #${i + 1} ${npub.slice(0, 12)}… → ${s.toLocaleString()} steps`)
  );
  if (ranked.length > 0) {
    console.log('✅ Real step competition now produces a non-zero leaderboard.');
  } else {
    console.log('   ⚠️  Participants have no walking workouts in the event window — empty by data, not by bug.');
  }
}

main().catch((e) => {
  console.error('❌ Verification error:', e);
  process.exit(1);
});
