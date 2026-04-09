/**
 * Verify: Competition queries use correct date filters/boundaries
 * Checks getLeaderboard date filtering, submitWorkoutSimple leaderboard_date,
 * daily leaderboard date boundaries, and timezone handling
 * Run: npx tsx scripts/verify/verify-competition-date-boundaries.ts
 */

import fs from 'fs';

const COMP_FILE = 'src/services/backend/SupabaseCompetitionService.ts';
const compSrc = fs.readFileSync(COMP_FILE, 'utf-8');

let passed = 0;
let failed = 0;

function assert(name: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  PASS: ${name}`);
    passed++;
  } else {
    console.log(`  FAIL: ${name}${detail ? ' -- ' + detail : ''}`);
    failed++;
  }
}

console.log('\n=== Competition Date Boundaries ===\n');

// 1. getLeaderboard filters by start_date/end_date
console.log('--- getLeaderboard date filters ---');
assert(
  'getLeaderboard uses startDate filter (gte)',
  compSrc.includes(".gte('created_at', startDate)")
);
assert(
  'getLeaderboard uses endDate filter (lte)',
  compSrc.includes(".lte('created_at', endDate)")
);
assert(
  'getLeaderboard reads competition start_date',
  compSrc.includes('competition.start_date')
);
assert(
  'getLeaderboard reads competition end_date',
  compSrc.includes('competition.end_date')
);
assert(
  'getLeaderboard supports dateOverride for custom date range',
  compSrc.includes('dateOverride?.startDate') && compSrc.includes('dateOverride?.endDate')
);

// 2. submitWorkoutSimple includes leaderboard_date
console.log('\n--- submitWorkoutSimple leaderboard_date ---');
assert(
  'submitWorkoutSimple sends leaderboard_date',
  compSrc.includes('leaderboard_date')
);
assert(
  'leaderboard_date uses local date (getFullYear/getMonth/getDate)',
  compSrc.includes('now.getFullYear()') &&
  compSrc.includes('now.getMonth()') &&
  compSrc.includes('now.getDate()')
);
assert(
  'leaderboard_date pads month and day',
  compSrc.includes("padStart(2, '0')")
);

// 3. Daily leaderboard uses date boundaries
console.log('\n--- Daily leaderboard date boundaries ---');
assert(
  'End date extended to end-of-day (23:59:59)',
  compSrc.includes('setUTCHours(23, 59, 59, 999)')
);
assert(
  'End-of-day comment explains timezone reasoning',
  compSrc.includes('west of UTC') || compSrc.includes('timezone')
);

// 4. Timezone handling
console.log('\n--- Timezone handling ---');
assert(
  'TIMEZONE FIX comment documents local vs UTC issue',
  compSrc.includes('TIMEZONE FIX')
);
assert(
  'Avoids toLocaleDateString for date computation',
  // The code should NOT use toLocaleDateString for the leaderboard_date
  // It explicitly uses getFullYear/getMonth/getDate instead
  compSrc.includes('toLocaleDateString') === false ||
  compSrc.includes('toLocaleDateString(\'en-CA\') can return UTC date'),
  'Should avoid toLocaleDateString or document its unreliability'
);
assert(
  'isInAnyActiveCompetition uses ISO date for comparison',
  compSrc.includes('new Date().toISOString()') && compSrc.includes('isInAnyActiveCompetition')
);
assert(
  'Competition date comparison uses lte/gte (not lt/gt)',
  compSrc.includes(".lte('competitions.start_date'") || compSrc.includes(".gte('competitions.end_date'")
);

// 5. Created_at date parsing for dedup
console.log('\n--- Date parsing for dedup ---');
assert(
  'Dedup extracts date from created_at with split T',
  compSrc.includes("w.created_at.split('T')[0]") || compSrc.includes("created_at ? w.created_at.split('T')[0]")
);

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
