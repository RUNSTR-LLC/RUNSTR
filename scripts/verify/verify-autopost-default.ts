/**
 * Verify the auto-post preference defaults ON, respects explicit opt-out,
 * and the one-time notice fires exactly once.
 * Run: npx tsx scripts/verify/verify-autopost-default.ts
 */

const store = new Map<string, string>();
// Minimal AsyncStorage mock, registered before the service is imported.
require.cache[require.resolve('@react-native-async-storage/async-storage')] = {
  exports: {
    __esModule: true,
    default: {
      getItem: async (k: string) => store.get(k) ?? null,
      setItem: async (k: string, v: string) => void store.set(k, v),
    },
  },
} as any;

async function main() {
  const { NostrPostingPreferencesService: Svc } = await import(
    '../../src/services/activity/NostrPostingPreferencesService'
  );

  let passed = 0;
  let failed = 0;
  const check = (name: string, got: unknown, expected: unknown) => {
    const ok = got === expected;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}: got ${got}, expected ${expected}`);
    ok ? passed++ : failed++;
  };

  // Fresh install: nothing stored -> auto-post ON
  Svc.clearCache();
  check('fresh install defaults ON', await Svc.isAutoPostEnabled(), true);

  // Explicit opt-out survives
  await Svc.setAutoPostEnabled(false);
  Svc.clearCache();
  check('explicit opt-out stays off', await Svc.isAutoPostEnabled(), false);

  // Explicit opt-in
  await Svc.setAutoPostEnabled(true);
  Svc.clearCache();
  check('explicit opt-in stays on', await Svc.isAutoPostEnabled(), true);

  // Legacy garbage value -> treated as ON (only literal 'false' disables)
  store.set('@runstr:auto_post_nostr', 'banana');
  Svc.clearCache();
  check('non-false value reads as ON', await Svc.isAutoPostEnabled(), true);

  // One-time notice: first call true, second call false
  check('notice shows first time', await Svc.shouldShowAutoPostNotice(), true);
  check('notice never repeats', await Svc.shouldShowAutoPostNotice(), false);

  // Format default unchanged
  Svc.clearCache();
  check('format still defaults to kind1301', await Svc.getPostFormat(), 'kind1301');

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

main();
