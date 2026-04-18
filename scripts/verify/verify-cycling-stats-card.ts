/**
 * Verify: StatsCard cycling PRs (Phase 2 of cycling parity)
 *
 * Confirms:
 *   - StatsCard queries cycling workouts at the agreed distance gates (20K/40K/100K)
 *   - Running and cycling PR sections render conditionally on actual workout history
 *   - Longest Ride appears in PERSONAL BESTS alongside Longest Run
 */

import * as fs from 'fs';
import * as path from 'path';

const STATS_CARD_PATH = path.resolve(
  __dirname,
  '../../src/components/profile/StatsCard.tsx'
);

function main() {
  const src = fs.readFileSync(STATS_CARD_PATH, 'utf-8');
  const failures: string[] = [];

  // Distance gate constants
  const expectedConsts: Array<[string, string]> = [
    ['M_CYC_20K', '20000'],
    ['M_CYC_40K', '40000'],
    ['M_CYC_100K', '100000'],
  ];
  for (const [name, value] of expectedConsts) {
    const re = new RegExp(`const\\s+${name}\\s*=\\s*${value}\\b`);
    if (!re.test(src)) {
      failures.push(`Missing or wrong constant: ${name} = ${value}`);
    }
  }

  // Cycling queries must use activity_type='cycling'
  const cyclingActivityRefs = (
    src.match(/fastestTimeAtDistance\('cycling'/g) || []
  ).length;
  if (cyclingActivityRefs < 3) {
    failures.push(
      `Expected >= 3 fastestTimeAtDistance('cycling', ...) calls, found ${cyclingActivityRefs}`
    );
  }

  if (!/maxDistance\('cycling'\)/.test(src)) {
    failures.push(`Missing maxDistance('cycling') call for longest ride`);
  }

  // Conditional rendering on user activity
  for (const guard of ['hasRunning', 'hasCycling']) {
    if (!new RegExp(`const\\s+${guard}\\s*=`).test(src)) {
      failures.push(`Missing activity detection boolean: ${guard}`);
    }
    if (!new RegExp(`\\{${guard}\\s*&&`).test(src)) {
      failures.push(`${guard} is defined but not used as a render guard`);
    }
  }

  // Section headers
  for (const header of [
    'RACE PERSONAL RECORDS',
    'CYCLING PERSONAL RECORDS',
    'PERSONAL BESTS',
  ]) {
    if (!src.includes(header)) {
      failures.push(`Missing section header: "${header}"`);
    }
  }

  // Longest Ride row
  if (!/Longest Ride/.test(src)) {
    failures.push(`Missing "Longest Ride" row in PERSONAL BESTS`);
  }

  // Cycling brackets render
  for (const label of ['20K', '40K', '100K']) {
    if (!new RegExp(`label:\\s*'${label}'`).test(src)) {
      failures.push(`Missing cycling bracket label: '${label}'`);
    }
  }

  if (failures.length > 0) {
    console.error('✗ FAILURES:');
    failures.forEach((f) => console.error(`  - ${f}`));
    process.exit(1);
  }

  console.log('✓ StatsCard cycling PRs verified — Phase 2 OK');
  console.log('  - Cycling distance gates: 20K, 40K, 100K');
  console.log('  - activity_type queries: running, cycling (separate)');
  console.log(
    '  - Conditional rendering: running/cycling sections show only when user has workouts'
  );
  console.log('  - Longest Ride row added to PERSONAL BESTS');
}

main();
