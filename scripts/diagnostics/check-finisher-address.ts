/**
 * Diagnostic: confirm migration 167 is live — get_competition_finishers must
 * return a `lightning_address` column. Usage:
 *   npx tsx scripts/diagnostics/check-finisher-address.ts <competition_id>
 */
import { supabase } from '../../src/utils/supabase';

async function main() {
  if (!supabase) {
    console.error('Supabase not configured — set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY before running.');
    process.exit(1);
  }

  const competitionId = process.argv[2];
  if (!competitionId) {
    console.error('Usage: npx tsx scripts/diagnostics/check-finisher-address.ts <competition_id>');
    process.exit(1);
  }

  const { data: comp, error: compErr } = await supabase
    .from('competitions')
    .select('start_date, end_date')
    .eq('id', competitionId)
    .single();
  if (compErr || !comp) {
    console.error('Competition not found:', compErr?.message);
    process.exit(1);
  }

  const { data: parts } = await supabase
    .from('competition_participants')
    .select('npub')
    .eq('competition_id', competitionId);
  const npubs = (parts || []).map((p: { npub: string }) => p.npub);

  const { data, error } = await supabase.rpc('get_competition_finishers', {
    p_competition_id: competitionId,
    p_npubs: npubs,
    p_start_date: comp.start_date,
    p_end_date: comp.end_date,
    p_qualifying_distance_meters: 0,
  });

  if (error) {
    console.error('RPC error (migration 167 may not be deployed):', error.message);
    process.exit(1);
  }

  const rows = (data || []) as Array<Record<string, unknown>>;
  console.log(`Finishers returned: ${rows.length}`);
  if (rows.length > 0) {
    const hasColumn = 'lightning_address' in rows[0];
    console.log(`Has lightning_address column: ${hasColumn}`);
    rows.forEach((r) =>
      console.log(`  ${String(r.npub).slice(0, 12)}… -> ${r.lightning_address ?? '(none)'}`),
    );
    if (!hasColumn) process.exit(1);
  } else {
    console.log('No finishers (cannot confirm column from data — re-run on an event with finishers).');
  }
}

main();
