/**
 * Verifies the public kind-1301 tag allowlist excludes every private tag and
 * includes the expected workout-data tags. Parses the real source so it tests
 * the shipped list, not a copy.
 *
 * Run: npx tsx scripts/verify/verify-1301-tag-allowlist.ts
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const src = readFileSync(
  join(__dirname, '..', '..', 'src/services/nostr/workoutPublishingService.ts'),
  'utf8'
);

// Extract the PUBLIC_TAG_ALLOWLIST = new Set([ ... ]) literal.
const m = src.match(/PUBLIC_TAG_ALLOWLIST\s*=\s*new Set\(\[([\s\S]*?)\]\)/);
if (!m) {
  console.log('❌ Could not find PUBLIC_TAG_ALLOWLIST in source');
  process.exit(1);
}
const allow = new Set(
  [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1])
);

let failures = 0;
const check = (name: string, cond: boolean) => {
  console.log(`${cond ? '✅' : '❌'} ${name}`);
  if (!cond) failures++;
};

// MUST be excluded — private reward/routing + anti-cheat tags.
const FORBIDDEN = [
  'lightning', 'reward_destination', 'wot_score', 'charity', 'challenge',
  'club', 'team', 'verified', 'verification_method', 'verification_confidence',
  'verification_reps', 'verification_algorithm',
];
for (const k of FORBIDDEN) {
  check(`excludes private tag "${k}"`, !allow.has(k));
}

// MUST be included — legitimate public workout-data tags.
const REQUIRED = [
  'd', 'title', 'exercise', 'duration', 'source', 'client', 't',
  'distance', 'calories', 'steps', 'split', 'avg_pace', 'workout_start_time',
];
for (const k of REQUIRED) {
  check(`includes public tag "${k}"`, allow.has(k));
}

// The filter must be allowlist-based (fail-closed), not a denylist.
check(
  'uses allowlist filter (ALLOWLIST.has)',
  /filter\(\(t\)\s*=>\s*PUBLIC_TAG_ALLOWLIST\.has\(t\[0\]\)\)/.test(src)
);
check('no leftover PUBLIC_TAG_BLOCKLIST', !/PUBLIC_TAG_BLOCKLIST/.test(src));

console.log(failures === 0 ? '\n✅ Allowlist is safe' : `\n❌ ${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
