/**
 * Diagnostic: inspect the `network_workouts` table (and confirm `workout_submissions`)
 * to design the workout feed. Reads via the anon key. Run: npx tsx scripts/diagnostics/inspect-network-workouts.ts
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const supa = createClient(url, key);

async function inspect(table: string, order?: string) {
  console.log(`\n===== ${table} =====`);
  let q = supa.from(table).select('*', { count: 'exact' });
  if (order) q = q.order(order, { ascending: false });
  const { data, error, count } = await q.limit(3);
  if (error) {
    console.log(`  ERROR: ${error.message} (code=${error.code})`);
    return;
  }
  console.log(`  row count (exact): ${count}`);
  if (!data || data.length === 0) {
    console.log('  (no rows returned — cannot infer columns from data)');
    return;
  }
  console.log('  columns:', Object.keys(data[0]).join(', '));
  data.forEach((row, i) => {
    console.log(`  --- sample row ${i} ---`);
    for (const [k, v] of Object.entries(row)) {
      const val = typeof v === 'object' && v !== null ? JSON.stringify(v).slice(0, 120) : String(v);
      console.log(`    ${k}: ${val?.slice ? val.slice(0, 120) : val}`);
    }
  });
}

(async () => {
  await inspect('network_workouts');
  await inspect('workout_submissions', 'created_at');
  process.exit(0);
})();
