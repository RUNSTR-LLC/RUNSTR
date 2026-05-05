/**
 * Verification: Strength category fully removed from the activity grid
 *
 * Asserts:
 *  - ACTIVITY_GRID has exactly one row (cardio)
 *  - That row's key is 'cardio'
 *  - That row's activities are exactly ['run', 'walk', 'cycle', 'hiking']
 *  - StrengthTrackerScreen.tsx no longer exists on disk
 *  - Neither ActivityTrackerScreen.tsx nor ProfileScreen.tsx mentions Strength
 *
 * Run: npx tsx scripts/verify/verify-strength-removed.ts
 */

import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { ACTIVITY_GRID } from '../../src/services/activity/ActivityGridService';

const repoRoot = resolve(__dirname, '../..');
const failures: string[] = [];

// 1. Grid shape
if (ACTIVITY_GRID.length !== 1) {
  failures.push(`ACTIVITY_GRID has ${ACTIVITY_GRID.length} rows; expected 1`);
}
if (ACTIVITY_GRID[0]?.key !== 'cardio') {
  failures.push(`ACTIVITY_GRID[0].key is ${ACTIVITY_GRID[0]?.key}; expected 'cardio'`);
}
const expectedActivities = ['run', 'walk', 'cycle', 'hiking'];
const actualActivities = ACTIVITY_GRID[0]?.activities ?? [];
if (
  actualActivities.length !== expectedActivities.length ||
  !expectedActivities.every((a, i) => actualActivities[i] === a)
) {
  failures.push(
    `ACTIVITY_GRID[0].activities is ${JSON.stringify(actualActivities)}; ` +
      `expected ${JSON.stringify(expectedActivities)}`,
  );
}

// 2. StrengthTrackerScreen.tsx removed
const strengthScreenPath = resolve(repoRoot, 'src/screens/activity/StrengthTrackerScreen.tsx');
if (existsSync(strengthScreenPath)) {
  failures.push(`File still exists: ${strengthScreenPath}`);
}

// 3. No strength references in tracker screens
const filesToScan = [
  'src/screens/activity/ActivityTrackerScreen.tsx',
  'src/screens/ProfileScreen.tsx',
];
for (const rel of filesToScan) {
  const abs = resolve(repoRoot, rel);
  if (!existsSync(abs)) {
    failures.push(`Expected file missing: ${rel}`);
    continue;
  }
  const contents = readFileSync(abs, 'utf8');
  if (/strength/i.test(contents)) {
    failures.push(`${rel} still mentions 'strength' (case-insensitive)`);
  }
}

if (failures.length > 0) {
  console.error('Strength-cut verification FAILED:');
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('Strength-cut verification PASSED.');
console.log(`  ACTIVITY_GRID: ${ACTIVITY_GRID.length} row, activities = [${actualActivities.join(', ')}]`);
console.log(`  StrengthTrackerScreen.tsx: removed`);
console.log(`  ActivityTrackerScreen.tsx + ProfileScreen.tsx: no 'strength' mentions`);
