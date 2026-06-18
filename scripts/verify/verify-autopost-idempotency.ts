/**
 * Verifies the auto-post effect is idempotent: it reads persisted post status
 * before publishing and persists status after success, so a workout is never
 * auto-posted twice (mirrors the auto-compete guard).
 *
 * Source-asserting (the effect is a React async effect that needs the app to
 * run). Run: npx tsx scripts/verify/verify-autopost-idempotency.ts
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const src = readFileSync(
  join(__dirname, '..', '..', 'src/components/activity/WorkoutSummaryModal.tsx'),
  'utf8'
);

// Isolate the auto-post effect body.
const start = src.indexOf('const attemptAutoPost');
const end = src.indexOf('attemptAutoPost();', start);
const effect = start >= 0 && end > start ? src.slice(start, end) : '';

let failures = 0;
const check = (name: string, cond: boolean) => {
  console.log(`${cond ? '✅' : '❌'} ${name}`);
  if (!cond) failures++;
};

check('auto-post effect found', effect.length > 0);

// Persisted guard BEFORE publishing.
check(
  'reads persisted status before posting',
  /getStatus\(workout\.localWorkoutId\)/.test(effect)
);
check(
  'returns early when already posted',
  /status\.postedToNostr\)\s*\{[\s\S]*?return;/.test(effect)
);

// Persists status AFTER a successful post.
check(
  'persists markAsPosted on success',
  /result\.success[\s\S]*?markAsPosted\(\s*workout\.localWorkoutId/.test(effect)
);

// On-open hydration of the in-memory guard from persisted status.
check(
  'hydrates postedToNostr from persisted status on open',
  /setSaved\(status\.competedInNostr\);[\s\S]*?setPostedToNostr\(status\.postedToNostr\)/.test(src)
);

console.log(failures === 0 ? '\n✅ Auto-post is idempotent' : `\n❌ ${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
