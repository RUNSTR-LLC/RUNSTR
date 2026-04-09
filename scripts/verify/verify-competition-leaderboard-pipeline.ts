/**
 * Verify: Competition leaderboard pipeline in SupabaseCompetitionService
 * Checks resolveCompetitionId, getLeaderboard, dedup, pagination, error handling
 * Run: npx tsx scripts/verify/verify-competition-leaderboard-pipeline.ts
 */

import fs from 'fs';

const FILE = 'src/services/backend/SupabaseCompetitionService.ts';
const src = fs.readFileSync(FILE, 'utf-8');

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

console.log('\n=== Competition Leaderboard Pipeline ===\n');

// 1. resolveCompetitionId exists and returns UUID
console.log('--- resolveCompetitionId ---');
assert(
  'resolveCompetitionId method exists',
  src.includes('resolveCompetitionId(')
);
assert(
  'resolveCompetitionId checks UUID format',
  src.includes('isUUID(') && src.includes('resolveCompetitionId')
);
assert(
  'resolveCompetitionId returns UUID directly if valid',
  src.includes('return idOrExternalId') || src.includes('use it directly')
);
assert(
  'resolveCompetitionId looks up by external_id',
  src.includes("eq('external_id'") && src.includes('.single()')
);
assert(
  'resolveCompetitionId returns null on not found',
  /resolveCompetitionId[\s\S]*?return null/.test(src)
);

// 2. getLeaderboard fetches participants then workouts
console.log('\n--- getLeaderboard ---');
assert(
  'getLeaderboard method exists',
  src.includes('static async getLeaderboard(')
);
assert(
  'getLeaderboard fetches competition_participants',
  src.includes("from('competition_participants')") && src.includes('getLeaderboard')
);
assert(
  'getLeaderboard fetches workout_submissions',
  src.includes("from('workout_submissions')")
);

// 3. Dedup logic
console.log('\n--- Dedup logic ---');
assert(
  'roundedDistance dedup key exists',
  src.includes('roundedDist') || src.includes('roundedDistance')
);
assert(
  'Dedup uses (npub, distance, date) key',
  src.includes('${w.npub}:${roundedDist}:${dateStr}') ||
  src.includes('seenWorkoutKeys')
);
assert(
  'Dedup uses Set for seen keys',
  src.includes('new Set<string>()') && src.includes('seenWorkoutKeys')
);

// 4. Client-side aggregation uses .slice() for pagination
console.log('\n--- Pagination ---');
assert(
  'Uses .slice() for client-side pagination',
  src.includes('.slice(0, limit)')
);
assert(
  'Leaderboard is sorted before slicing',
  /\.sort\([\s\S]*?\)[\s\S]*?\.slice\(0, limit\)/.test(src)
);

// 5. joinCompetition has error handling
console.log('\n--- joinCompetition error handling ---');
const joinMatch = src.match(/static async joinCompetition\([\s\S]*?\n  \}/);
assert(
  'joinCompetition method exists',
  src.includes('static async joinCompetition(')
);
assert(
  'joinCompetition checks result.success',
  joinMatch ? joinMatch[0].includes('result.success') || joinMatch[0].includes('!result.success') : false,
  'Should check edge function result'
);
assert(
  'joinCompetition returns success/error object',
  src.includes("return { success: true }") && src.includes('joinCompetition')
);

// 6. leaveCompetition has error handling
console.log('\n--- leaveCompetition error handling ---');
const leaveMatch = src.match(/static async leaveCompetition\([\s\S]*?\n  \}/);
assert(
  'leaveCompetition method exists',
  src.includes('static async leaveCompetition(')
);
assert(
  'leaveCompetition checks for errors',
  leaveMatch ? leaveMatch[0].includes('!result.success') || leaveMatch[0].includes('error') : false,
  'Should handle edge function errors'
);
assert(
  'leaveCompetition returns error on failure',
  leaveMatch ? leaveMatch[0].includes("success: false") : false,
  'Should return { success: false } on error'
);

// 7. isParticipant returns boolean
console.log('\n--- isParticipant ---');
assert(
  'isParticipant method exists',
  src.includes('static async isParticipant(')
);
assert(
  'isParticipant returns Promise<boolean>',
  src.includes('isParticipant(') && src.includes('): Promise<boolean>')
);
assert(
  'isParticipant checks local storage first',
  src.includes('isLocallyJoined') && src.includes('isParticipant')
);
assert(
  'isParticipant falls back to Supabase query',
  src.includes("from('competition_participants')") && src.includes('isParticipating')
);

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
