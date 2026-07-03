/**
 * Verify all three daily-step writers share one canonical eventId.
 * 1. dailyStepsEventId produces the expected local-date format.
 * 2. No file besides the helper constructs a `steps_` event ID inline.
 * 3. All three writers reference the helper.
 * Run: npx tsx scripts/verify/verify-step-eventid-unification.ts
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { dailyStepsEventId } from '../../src/utils/stepEventId';

let passed = 0;
let failed = 0;
const check = (name: string, ok: boolean, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  ok ? passed++ : failed++;
};

// 1. Format: steps_YYYY-MM-DD_first12ofNpub, using the LOCAL date
const npub = 'npub1abcdefghijklmnopqrstuvwxyz012345';
const d = new Date(2026, 6, 3, 23, 30); // July 3 local, late evening
check(
  'helper format',
  dailyStepsEventId(npub, d) === 'steps_2026-07-03_npub1abcdefg',
  dailyStepsEventId(npub, d)
);

// 2. No inline `steps_${...}` construction outside the helper
const offenders: string[] = [];
const walk = (dir: string) => {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(ts|tsx)$/.test(p) && !p.endsWith('utils/stepEventId.ts')) {
      if (/`steps_\$\{/.test(readFileSync(p, 'utf8'))) offenders.push(p);
    }
  }
};
walk('src');
check('no inline steps_ eventId construction', offenders.length === 0, offenders.join(', '));

// 3. All three writers use the helper
for (const f of [
  'src/services/competition/StepCompetitionService.ts',
  'src/services/fitness/HealthKitBackgroundService.ts',
  'src/services/fitness/AndroidBackgroundSyncTask.ts',
]) {
  check(`${f} uses dailyStepsEventId`, readFileSync(f, 'utf8').includes('dailyStepsEventId'));
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
