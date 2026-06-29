/**
 * Diagnostic: inspect what we actually store from pulled-in 1301 notes in
 * `network_workouts` — specifically the activity_type spread and the full
 * tags/raw_event payload for non-cardio (strength etc.) rows, so we know what
 * the feed card can display. Run: npx tsx scripts/diagnostics/inspect-1301-strength.ts
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const supa = createClient(url, key);

(async () => {
  const { data, error, count } = await supa
    .from('network_workouts')
    .select('*', { count: 'exact' })
    .order('event_created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.log(`ERROR: ${error.message} (code=${error.code})`);
    process.exit(1);
  }
  console.log(`network_workouts total rows: ${count}`);
  if (!data || data.length === 0) {
    console.log('(no rows — nothing pulled in yet)');
    process.exit(0);
  }

  console.log('columns:', Object.keys(data[0]).join(', '));

  // activity_type spread
  const spread: Record<string, number> = {};
  for (const r of data) {
    const t = String(r.activity_type ?? 'null');
    spread[t] = (spread[t] || 0) + 1;
  }
  console.log('\nactivity_type spread (last 50):', JSON.stringify(spread));

  // Non-cardio rows: dump full tags + raw_event
  const cardio = new Set(['running', 'walking', 'cycling', 'hiking', 'run', 'walk', 'cycle', 'hike']);
  const nonCardio = data.filter((r) => !cardio.has(String(r.activity_type ?? '').toLowerCase()));
  console.log(`\n=== ${nonCardio.length} non-cardio rows (full payload) ===`);
  nonCardio.slice(0, 5).forEach((r, i) => {
    console.log(`\n--- non-cardio row ${i} (activity_type=${r.activity_type}, client=${r.client}) ---`);
    console.log('  title:', r.title);
    console.log('  distance_meters:', r.distance_meters, '| duration_seconds:', r.duration_seconds, '| calories:', r.calories, '| steps:', r.steps);
    console.log('  tags:', JSON.stringify(r.tags));
    console.log('  raw_event:', JSON.stringify(r.raw_event)?.slice(0, 1500));
  });

  // Also dump one cardio row's tags for comparison of the tag schema
  const oneCardio = data.find((r) => cardio.has(String(r.activity_type ?? '').toLowerCase()));
  if (oneCardio) {
    console.log('\n=== one cardio row (tag schema reference) ===');
    console.log('  activity_type:', oneCardio.activity_type, '| client:', oneCardio.client);
    console.log('  tags:', JSON.stringify(oneCardio.tags));
  }

  process.exit(0);
})();
