/**
 * Verifies the bonus rewards migration applied correctly and the rewardLabel
 * helper renders every supported reward_type.
 *
 * Run: npx tsx scripts/verify/verify-bonus-rewards-schema.ts
 */

import { createClient } from '@supabase/supabase-js';
import { rewardLabel } from '../../src/screens/rewardLabel';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY env vars');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function verifyTablesExist() {
  const tables = ['monthly_budget_state', 'daily_bonus_payouts', 'event_bonus_payouts'];
  for (const t of tables) {
    const { error } = await supabase.from(t).select('*').limit(0);
    if (error) {
      console.error(`❌ Table ${t} not readable:`, error.message);
      process.exit(1);
    }
    console.log(`✓ Table ${t} exists and is readable`);
  }
}

async function verifyMetadataColumn() {
  // Read one row with metadata to confirm the column is selectable.
  // (No rows is also OK — column existence is what we're checking.)
  const { error } = await supabase
    .from('reward_payments')
    .select('id, reward_type, metadata')
    .limit(1);
  if (error) {
    console.error('❌ reward_payments.metadata not selectable:', error.message);
    process.exit(1);
  }
  console.log('✓ reward_payments.metadata column exists');
}

function verifyLabelHelper() {
  const cases: Array<{
    rewardType: string;
    metadata: Record<string, any> | null;
    expectedLabel: string;
  }> = [
    { rewardType: 'workout', metadata: null, expectedLabel: 'Workout reward' },
    { rewardType: 'steps', metadata: null, expectedLabel: 'Steps reward' },
    {
      rewardType: 'daily_bonus',
      metadata: { leaderboard_label: 'Half Marathon', place: 1 },
      expectedLabel: 'Half Marathon Daily — 1st place',
    },
    {
      rewardType: 'daily_bonus',
      metadata: { leaderboard_label: '5K', place: 2 },
      expectedLabel: '5K Daily — 2nd place',
    },
    {
      rewardType: 'daily_bonus',
      metadata: { leaderboard_label: 'Steps', place: 3 },
      expectedLabel: 'Steps Daily — 3rd place',
    },
    {
      rewardType: 'event_bonus',
      metadata: { event_name: 'Ohio Ruckers Sprint', place: 2 },
      expectedLabel: 'Ohio Ruckers Sprint — 2nd place',
    },
    { rewardType: 'unknown_future_type', metadata: null, expectedLabel: 'Reward' },
    { rewardType: 'daily_bonus', metadata: null, expectedLabel: 'Daily bonus' },
    { rewardType: 'event_bonus', metadata: null, expectedLabel: 'Event bonus' },
  ];

  let failures = 0;
  for (const c of cases) {
    const { label } = rewardLabel(c.rewardType, c.metadata);
    if (label !== c.expectedLabel) {
      console.error(
        `❌ rewardLabel(${c.rewardType}, ${JSON.stringify(c.metadata)}) → "${label}" (expected "${c.expectedLabel}")`
      );
      failures++;
    } else {
      console.log(`✓ rewardLabel(${c.rewardType}) → "${label}"`);
    }
  }
  if (failures > 0) {
    console.error(`\n${failures} label test(s) failed`);
    process.exit(1);
  }
}

async function main() {
  console.log('Verifying bonus rewards schema and label helper...\n');
  await verifyTablesExist();
  await verifyMetadataColumn();
  console.log('');
  verifyLabelHelper();
  console.log('\nAll checks passed.');
}

main().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
