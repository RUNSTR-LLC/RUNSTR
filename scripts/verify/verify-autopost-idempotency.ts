/**
 * Verifies the post-run auto-publish is idempotent: the summary reads persisted
 * post status before publishing and returns early for an already-published
 * run, and publishRun persists the status after success, so a run is never
 * auto-published twice.
 *
 * Source-asserting (the effect is a React async effect that needs the app to
 * run). Run: npx tsx scripts/verify/verify-autopost-idempotency.ts
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const read = (p: string) => readFileSync(join(__dirname, '..', '..', p), 'utf8');
const src = read('src/components/activity/WorkoutSummaryModal.tsx');
const publishRun = read('src/services/nostr/publishRun.ts');

// Isolate the open-time decision effect body.
const start = src.indexOf('const decide = async');
const end = src.indexOf('decide();', start);
const effect = start >= 0 && end > start ? src.slice(start, end) : '';

let failures = 0;
const check = (name: string, cond: boolean) => {
  console.log(`${cond ? '✅' : '❌'} ${name}`);
  if (!cond) failures++;
};

check('auto-publish effect found', effect.length > 0);

// Persisted guard BEFORE publishing.
const statusAt = effect.search(/getStatus\(workout\.localWorkoutId\)/);
const publishAt = effect.indexOf('await publish()');
check('reads persisted status before publishing', statusAt >= 0 && publishAt > statusAt);
check(
  'returns early when already published',
  /status\.postedToNostr\)\s*\{[\s\S]*?return;/.test(effect)
);
check('respects the auto-publish setting', /isAutoPostEnabled\(\)/.test(effect));

// In-flight guard and persisted status AFTER a successful publish.
check('guards against a second publish in flight', /publishingRef\.current\) return/.test(src));
check(
  'publishRun persists markAsPosted on success',
  /status: 'failed'[\s\S]*markAsPosted\(/.test(publishRun)
);

console.log(failures ? `\n❌ ${failures} failed` : '\n✅ Auto-publish is idempotent');
process.exit(failures ? 1 : 0);
