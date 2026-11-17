/**
 * Verifies the 2026-11-16 polish pass: copy matches the four basics, the run
 * views are running-only, one vocabulary, colors come from theme tokens, and
 * the language picker / dead support form are gone. Static checks only.
 *
 * Run: npx tsx scripts/verify/verify-polish-pass.ts
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join } from 'path';

let failures = 0;
const check = (ok: boolean, label: string) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok) failures++;
};
const read = (p: string) => readFileSync(p, 'utf8');
const lines = (p: string) => read(p).split('\n').length;
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(p) ? [p] : [];
  });

// 1. Copy describes the current product
const stale = /\b(teams?|captain|competition|leaderboard|nutzap|ecash|coinos|bitcoin|sats|reward)\b/i;
for (const f of ['src/screens/HelpSupportScreen.tsx', 'src/screens/PrivacyPolicyScreen.tsx']) {
  check(!stale.test(read(f)), `${f} has no deleted-feature wording`);
}
check(!/password/i.test(read('src/screens/LoginScreen.tsx').replace(/\/\/.*$/gm, '')), 'Login says nsec, not password');
check(!/manage teams/.test(read('src/screens/LoginScreen.tsx')), 'Amber error has no team wording');
check(!/abit|ournal/.test(read('src/components/backup/ExportDataModal.tsx')), 'Export modal shows no habits/journal');
check(!existsSync('src/screens/ContactSupportScreen.tsx'), 'Contact Support (never sent anything) is gone');
check(!existsSync('src/utils/analytics.ts'), 'team-era analytics stub is gone');

// 2. Running-only run views
const detail = 'src/components/profile/shared/WorkoutDetailModal.tsx';
const card = 'src/components/profile/shared/EnhancedWorkoutCard.tsx';
check(lines(detail) < 500, `${detail} under 500 lines (${lines(detail)})`);
check(!/meditation|fasting|fitness_test|strength|weather/i.test(read(detail)), 'detail modal is running-only');
check(!/meditation|fasting|fitness_test|weather|✓/i.test(read(card)), 'history card is running-only, no text checkmark');
check(!/cycl|pushup|pullup/i.test(read('src/components/profile/StatsCard.tsx')), 'StatsCard has running records only');

// 3. One vocabulary
check(!/Posted|'Post'/.test(read(card)), 'history card has no Post/Posted');
check(!/Delete Workout|title="Workout"/.test(read('src/components/profile/tabs/UnifiedWorkoutsTab.tsx')), 'History says "run"');

// 4. One palette: UI code takes colors from theme (shadows and gradients excepted)
const hex = /['"]#[0-9A-Fa-f]{3,8}['"]/;
const uiFiles = [...walk('src/components'), ...walk('src/screens'), ...walk('src/navigation'), 'src/App.tsx'];
const offenders = uiFiles
  .filter((f) => !f.includes('__tests__'))
  .flatMap((f) =>
    read(f).split('\n').map((l, i) => ({ f, i: i + 1, l }))
  )
  .filter(({ l }) => hex.test(l) && !/shadowColor|colors=\{\[/.test(l));
check(offenders.length === 0, `no hardcoded hex colors outside theme (${offenders.length})`);
offenders.slice(0, 10).forEach(({ f, i, l }) => console.log(`      ${f}:${i} ${l.trim()}`));
check(
  !walk('src/services').some((f) => /notificationColor: ['"]#/.test(read(f))),
  'Android tracking notification uses the theme orange'
);

// 5. Settings in one language
check(!existsSync('src/components/settings/LanguageSection.tsx'), 'language picker is gone');
check(/lng: 'en'/.test(read('src/i18n/index.ts')), 'i18n is fixed to English');
check(!/LanguageSection/.test(read('src/screens/SettingsScreen.tsx')), 'Settings renders no language section');

// 6. Unfinished states
check(!/No User Found/.test(read('src/screens/WorkoutHistoryScreen.tsx')), 'History error state reads like product copy');
check(!/[Tt]eam|club/.test(read('src/components/ui/LoadingStates.tsx')), 'LoadingStates has no team/club wording');
check(/PUBLIC_NOTICE_KEY/.test(read('src/components/activity/WorkoutSummaryModal.tsx')), 'first publish says runs are public');

console.log(failures === 0 ? '\nAll checks passed' : `\n${failures} check(s) failed`);
process.exit(failures === 0 ? 0 : 1);
