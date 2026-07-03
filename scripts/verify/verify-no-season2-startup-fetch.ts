/**
 * Verify the Season-2 leaderboard baseline is no longer fetched at startup,
 * and that its only remaining consumer is the (unreachable) useSeason2 hook.
 * Run: npx tsx scripts/verify/verify-no-season2-startup-fetch.ts
 */
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

let passed = 0;
let failed = 0;
const check = (name: string, ok: boolean, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  ok ? passed++ : failed++;
};

const appInit = readFileSync('src/services/core/AppInitializationService.ts', 'utf8');
check('startup no longer imports LeaderboardBaselineService', !appInit.includes('LeaderboardBaselineService'));
check('startup no longer fetches baseline', !appInit.includes('fetchBaseline'));

const importers = execSync(
  `grep -rln "LeaderboardBaselineService" src --include="*.ts" --include="*.tsx" | grep -v "services/season/LeaderboardBaselineService" || true`,
  { encoding: 'utf8' }
)
  .trim()
  .split('\n')
  .filter(Boolean);
check(
  'only remaining consumer is useSeason2 (dead cluster)',
  importers.length === 1 && importers[0] === 'src/hooks/useSeason2.ts',
  importers.join(', ') || 'none'
);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
