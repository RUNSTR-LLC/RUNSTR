/**
 * One-shot probe to confirm every expected column exists on the new bonus tables.
 * Selects each column by name — Supabase returns a clear error if any are missing.
 *
 * Run: npx tsx scripts/verify/probe-bonus-schema-shape.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const probes: Array<{ table: string; columns: string[] }> = [
  {
    table: 'monthly_budget_state',
    columns: ['month', 'budget_total', 'budget_spent', 'last_updated_at'],
  },
  {
    table: 'daily_bonus_payouts',
    columns: [
      'id',
      'payout_date',
      'leaderboard_id',
      'place',
      'recipient_pubkey',
      'amount_sats',
      'status',
      'reward_payment_id',
      'created_at',
    ],
  },
  {
    table: 'event_bonus_payouts',
    columns: [
      'id',
      'event_id',
      'place',
      'recipient_pubkey',
      'amount_sats',
      'status',
      'ineligible_reason',
      'reward_payment_id',
      'created_at',
    ],
  },
  {
    table: 'reward_payments',
    columns: [
      'id',
      'npub',
      'amount_sats',
      'reward_type',
      'status',
      'paid_at',
      'metadata',
    ],
  },
];

async function main() {
  let failures = 0;
  for (const probe of probes) {
    const { error } = await supabase
      .from(probe.table)
      .select(probe.columns.join(','))
      .limit(0);
    if (error) {
      console.error(`❌ ${probe.table}: ${error.message}`);
      failures++;
    } else {
      console.log(`✓ ${probe.table} has all expected columns: ${probe.columns.join(', ')}`);
    }
  }
  console.log('');
  if (failures > 0) {
    console.error(`${failures} table(s) have missing columns`);
    process.exit(1);
  }
  console.log('Schema shape is correct on all four tables.');
}

main().catch((err) => {
  console.error('Probe failed:', err);
  process.exit(1);
});
