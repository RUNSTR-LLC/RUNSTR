/**
 * Verify: HealthKit dedup store consistency between foreground and background services
 * Checks AsyncStorage keys, event ID prefixes, and potential double submission risks
 * Run: npx tsx scripts/verify/verify-healthkit-dedup-consistency.ts
 */

import fs from 'fs';

const FG_FILE = 'src/services/fitness/healthKitService.ts';
const BG_FILE = 'src/services/fitness/HealthKitBackgroundService.ts';
const fgSrc = fs.readFileSync(FG_FILE, 'utf-8');
const bgSrc = fs.readFileSync(BG_FILE, 'utf-8');

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

// Extract AsyncStorage keys
const fgKeyMatch = fgSrc.match(/SUBMITTED_IDS_KEY\s*=\s*'([^']+)'/);
const bgKeyMatch = bgSrc.match(/SUBMITTED_IDS_KEY\s*=\s*'([^']+)'/);
const fgKey = fgKeyMatch ? fgKeyMatch[1] : 'NOT FOUND';
const bgKey = bgKeyMatch ? bgKeyMatch[1] : 'NOT FOUND';

// Extract event ID prefixes
const fgPrefixMatch = fgSrc.match(/eventId\s*=\s*`(hk_[^$]*)\$\{/);
const bgPrefixMatch = bgSrc.match(/eventId\s*=\s*`(hk_bg_[^$]*)\$\{/) || bgSrc.match(/eventId\s*=\s*`(hk_[^$]*)\$\{/);
const fgPrefix = fgPrefixMatch ? fgPrefixMatch[1] : 'NOT FOUND';
const bgPrefix = bgPrefixMatch ? bgPrefixMatch[1] : 'NOT FOUND';

console.log('\n=== HealthKit Dedup Consistency ===\n');

// 1. AsyncStorage key discovery
console.log('--- AsyncStorage dedup keys ---');
assert(
  `Foreground key found: ${fgKey}`,
  fgKey !== 'NOT FOUND'
);
assert(
  `Background key found: ${bgKey}`,
  bgKey !== 'NOT FOUND'
);
assert(
  'Foreground and background use DIFFERENT AsyncStorage keys',
  fgKey !== bgKey,
  `FG="${fgKey}" vs BG="${bgKey}"`
);

// 2. Event ID prefix analysis
console.log('\n--- Event ID prefixes ---');
assert(
  `Foreground prefix: ${fgPrefix}`,
  fgPrefix !== 'NOT FOUND'
);
assert(
  `Background prefix: ${bgPrefix}`,
  bgPrefix !== 'NOT FOUND'
);
assert(
  'Foreground and background use DIFFERENT event ID prefixes',
  fgPrefix !== bgPrefix,
  `FG="${fgPrefix}" vs BG="${bgPrefix}" -- different prefixes prevent server-side dedup collision`
);

// 3. Separate vs shared dedup stores
console.log('\n--- Dedup store isolation ---');
const storesAreSeparate = fgKey !== bgKey;
assert(
  'Dedup stores are separate (each service tracks its own submitted IDs)',
  storesAreSeparate,
  storesAreSeparate
    ? 'Each service independently tracks what it has submitted'
    : 'SHARED store -- unexpected'
);

// 4. Double submission risk analysis
console.log('\n--- Double submission risk ---');
// Since stores are separate, the same HealthKit workout UUID could be submitted
// by BOTH foreground and background. However, the different event ID prefixes
// (hk_ vs hk_bg_) mean the server sees them as different events.
// The server-side dedup in getLeaderboard uses (npub, roundedDistance, date) to catch this.
const serverDedupExists = fs.readFileSync('src/services/backend/SupabaseCompetitionService.ts', 'utf-8')
  .includes('seenWorkoutKeys');

assert(
  'Separate stores COULD cause same workout submitted twice (FG + BG)',
  storesAreSeparate,
  'Both services can submit the same HealthKit UUID independently'
);
assert(
  'Different event ID prefixes mean server sees them as distinct events',
  fgPrefix !== bgPrefix,
  `hk_ vs hk_bg_ -- same workout gets two different event_ids`
);
assert(
  'Server-side dedup in getLeaderboard catches duplicates (npub+distance+date)',
  serverDedupExists,
  serverDedupExists
    ? 'seenWorkoutKeys dedup in getLeaderboard prevents double-counting on leaderboard'
    : 'NO server-side dedup found -- duplicates could inflate scores'
);

// 5. Background service has GPS session guard
console.log('\n--- Background sync guards ---');
assert(
  'Background service checks for active GPS session before syncing',
  bgSrc.includes('checkGPSSessionGuard') || bgSrc.includes('GPS session active'),
  'Prevents background sync from conflicting with active tracking'
);
assert(
  'Background service has sync mutex (prevents concurrent syncs)',
  bgSrc.includes('syncInProgress'),
  'Prevents race conditions from multiple background wakes'
);

// 6. Both services cap stored IDs
console.log('\n--- Stored ID limits ---');
const fgMaxMatch = fgSrc.match(/MAX_SUBMITTED_IDS\s*=\s*(\d+)/);
const bgMaxMatch = bgSrc.match(/MAX_STORED_IDS\s*=\s*(\d+)/);
const fgMax = fgMaxMatch ? fgMaxMatch[1] : 'NOT FOUND';
const bgMax = bgMaxMatch ? bgMaxMatch[1] : 'NOT FOUND';
assert(
  `Foreground caps stored IDs at ${fgMax}`,
  fgMax !== 'NOT FOUND'
);
assert(
  `Background caps stored IDs at ${bgMax}`,
  bgMax !== 'NOT FOUND'
);

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
