/**
 * Verify: Daily cycling leaderboards (Phase 3 of cycling parity)
 *
 * Confirms the app layer is ready for the Supabase migration:
 *   - Migration file 177 exists and adds the cycling time columns + indexes
 *   - submit-workout edge function computes cycling target times
 *   - DailyLeaderboardService exposes cycling boards and queries the new columns
 *   - LeaderboardsContent renders all three cycling cards when data is present
 *
 * NOTE: This script does not connect to Supabase — it validates the app/edge
 * function source code matches the migration schema. The migration itself must
 * be applied in Supabase SQL editor before the app can successfully query.
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');
const MIGRATION = path.join(ROOT, 'supabase/migrations/177_cycling_daily_leaderboards.sql');
const SUBMIT_WORKOUT = path.join(ROOT, 'supabase/functions/submit-workout/index.ts');
const LEADERBOARD_SERVICE = path.join(ROOT, 'src/services/competition/DailyLeaderboardService.ts');
const LEADERBOARDS_CONTENT = path.join(ROOT, 'src/components/compete/LeaderboardsContent.tsx');

const CYCLING_COLUMNS = [
  'time_cycling_20k_seconds',
  'time_cycling_40k_seconds',
  'time_cycling_100k_seconds',
];

const CYCLING_BOARDS = [
  'leaderboardCycling20k',
  'leaderboardCycling40k',
  'leaderboardCycling100k',
];

function read(p: string): string {
  return fs.readFileSync(p, 'utf-8');
}

function main() {
  const failures: string[] = [];

  // 1. Migration must exist and add all three columns + indexes
  if (!fs.existsSync(MIGRATION)) {
    failures.push('Missing migration: 177_cycling_daily_leaderboards.sql');
  } else {
    const sql = read(MIGRATION);
    for (const col of CYCLING_COLUMNS) {
      if (!new RegExp(`ADD COLUMN IF NOT EXISTS ${col}`).test(sql)) {
        failures.push(`Migration 177 does not ADD COLUMN ${col}`);
      }
      const idxPattern = new RegExp(`CREATE INDEX[\\s\\S]*?${col}`);
      if (!idxPattern.test(sql)) {
        failures.push(`Migration 177 missing index covering ${col}`);
      }
    }
  }

  // 2. submit-workout must compute cycling target times + insert them
  const submit = read(SUBMIT_WORKOUT);
  if (!/calculateAllCyclingTargetTimes/.test(submit)) {
    failures.push('submit-workout missing calculateAllCyclingTargetTimes helper');
  }
  if (!/classifiedActivityType === 'cycling'/.test(submit)) {
    failures.push('submit-workout does not guard cycling calc on activity_type');
  }
  for (const col of CYCLING_COLUMNS) {
    if (!new RegExp(`${col}:`).test(submit)) {
      failures.push(`submit-workout insert is missing column: ${col}`);
    }
  }

  // 3. DailyLeaderboardService must expose + fetch cycling boards
  const service = read(LEADERBOARD_SERVICE);
  for (const board of CYCLING_BOARDS) {
    if (!new RegExp(`${board}:\\s*LeaderboardEntry`).test(service)) {
      failures.push(`DailyLeaderboardService missing board type: ${board}`);
    }
    if (!new RegExp(`${board}:\\s*this\\.buildTimeLeaderboard`).test(service)) {
      failures.push(`DailyLeaderboardService not building ${board}`);
    }
  }
  for (const col of CYCLING_COLUMNS) {
    if (!new RegExp(col).test(service)) {
      failures.push(`DailyLeaderboardService not selecting column: ${col}`);
    }
  }

  // Verify hybrid merge handles cycling
  if (!/activityType === 'cycling'/.test(service)) {
    failures.push('DailyLeaderboardService mergeWithPending does not handle cycling');
  }

  // 4. LeaderboardsContent must render three cycling cards
  const content = read(LEADERBOARDS_CONTENT);
  for (const board of CYCLING_BOARDS) {
    if (
      !new RegExp(
        `globalLeaderboards\\.${board}\\.length\\s*>\\s*0`
      ).test(content)
    ) {
      failures.push(`LeaderboardsContent not rendering ${board} card`);
    }
  }

  if (failures.length > 0) {
    console.error('✗ FAILURES:');
    failures.forEach((f) => console.error(`  - ${f}`));
    process.exit(1);
  }

  console.log('✓ Cycling daily leaderboards wiring verified — Phase 3 OK');
  console.log('  - Migration 177: 3 columns + 3 partial indexes');
  console.log('  - submit-workout: cycling target times computed + inserted');
  console.log('  - DailyLeaderboardService: 3 boards exposed, selected, merged');
  console.log('  - LeaderboardsContent: 3 cycling cards render conditionally');
  console.log('');
  console.log('REMINDER: Apply migration 177 in Supabase SQL editor BEFORE');
  console.log('shipping this app version. Otherwise daily leaderboard queries');
  console.log('will fail with "column does not exist" until the schema updates.');
}

main();
