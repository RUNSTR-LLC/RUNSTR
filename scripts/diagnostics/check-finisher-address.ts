/**
 * Diagnostic: confirm migration 167 is live — get_competition_finishers must
 * return a `lightning_address` column, and the deployed finalize-ticketed-event
 * edge function must pass it through as `lightningAddress`.
 *
 * Runs standalone under tsx (does NOT import src/utils/supabase, which pulls in
 * react-native and crashes outside the app). Loads .env itself.
 *
 * Usage:
 *   npx tsx scripts/diagnostics/check-finisher-address.ts [competition_id]
 * If no competition_id is given, it picks the most recent ended event with
 * participants.
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

async function main() {
  if (!url || !key) {
    console.error('Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY (set them in .env).');
    process.exit(1);
  }
  const supabase = createClient(url, key);

  // 1. Resolve the competition to test (arg, or auto-pick a recent ended one with participants).
  let competitionId = process.argv[2];
  let comp: { id: string; start_date: string; end_date: string } | null = null;

  if (competitionId) {
    const { data, error } = await supabase
      .from('competitions')
      .select('id, start_date, end_date')
      .eq('id', competitionId)
      .single();
    if (error || !data) {
      console.error('Competition not found:', error?.message);
      process.exit(1);
    }
    comp = data as typeof comp;
  } else {
    const { data: comps, error } = await supabase
      .from('competitions')
      .select('id, name, start_date, end_date')
      .lt('end_date', new Date().toISOString())
      .order('end_date', { ascending: false })
      .limit(25);
    if (error) {
      console.error('Competition query error:', error.message);
      process.exit(1);
    }
    for (const c of comps || []) {
      const { count } = await supabase
        .from('competition_participants')
        .select('npub', { count: 'exact', head: true })
        .eq('competition_id', c.id);
      if ((count || 0) > 0) {
        comp = c as typeof comp;
        console.log(`Auto-selected ended event: ${(c as { name?: string }).name} (${c.id})`);
        break;
      }
    }
    if (!comp) {
      console.error('No ended competition with participants found.');
      process.exit(1);
    }
  }
  competitionId = comp.id;

  const { data: parts } = await supabase
    .from('competition_participants')
    .select('npub')
    .eq('competition_id', competitionId);
  const npubs = (parts || []).map((p: { npub: string }) => p.npub);

  // 2. Verify the RPC (migration 167) returns lightning_address.
  const { data: rpcRows, error: rpcErr } = await supabase.rpc('get_competition_finishers', {
    p_competition_id: competitionId,
    p_npubs: npubs,
    p_start_date: comp.start_date,
    p_end_date: comp.end_date,
    p_qualifying_distance_meters: 0,
  });
  if (rpcErr) {
    console.error('RPC error (migration 167 may not be deployed):', rpcErr.message);
    process.exit(1);
  }
  const rows = (rpcRows || []) as Array<Record<string, unknown>>;
  console.log(`\n[RPC] finishers: ${rows.length}`);
  if (rows.length > 0) {
    const hasColumn = 'lightning_address' in rows[0];
    console.log(`[RPC] has lightning_address column: ${hasColumn}`);
    rows.slice(0, 8).forEach((r) =>
      console.log(`  ${String(r.npub).slice(0, 12)}… -> ${r.lightning_address ?? '(none)'}`),
    );
    if (!hasColumn) process.exit(1);
  }

  // 3. Verify the deployed edge function passes it through as lightningAddress.
  const res = await fetch(`${url}/functions/v1/finalize-ticketed-event`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'get_finishers', competition_id: competitionId, qualifying_distance_km: 0 }),
  });
  const json = (await res.json()) as {
    success?: boolean;
    data?: { finishers?: Array<Record<string, unknown>> };
    error?: string;
  };
  const finishers = json?.data?.finishers || [];
  console.log(`\n[edge] finishers: ${finishers.length}`);
  if (finishers.length > 0) {
    const hasField = 'lightningAddress' in finishers[0];
    console.log(`[edge] has lightningAddress field: ${hasField}`);
    if (!hasField) {
      console.error('Edge function is NOT passing lightningAddress through — redeploy finalize-ticketed-event.');
      process.exit(1);
    }
  }

  console.log('\nOK — migration 167 + edge passthrough both confirmed.');
}

main();
