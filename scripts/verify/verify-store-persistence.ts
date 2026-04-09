/**
 * Verify that userStore and teamStore have AsyncStorage persistence configured correctly.
 * Checks: persist middleware, partialize, version, storage key, hydration flag.
 */

import * as fs from 'fs';
import * as path from 'path';

const STORE_DIR = path.resolve(__dirname, '../../src/store');

function checkFile(filename: string, checks: { label: string; test: (content: string) => boolean }[]) {
  const filepath = path.join(STORE_DIR, filename);
  const content = fs.readFileSync(filepath, 'utf-8');
  let passed = 0;
  let failed = 0;

  for (const { label, test } of checks) {
    if (test(content)) {
      console.log(`  [PASS] ${label}`);
      passed++;
    } else {
      console.log(`  [FAIL] ${label}`);
      failed++;
    }
  }

  return { passed, failed };
}

/** Extract the body of the partialize function from file content */
function getPartializeBody(content: string): string {
  const match = content.match(/partialize:\s*\(state\)[^{]*\{([^}]+)\}/s);
  return match ? match[1] : '';
}

console.log('=== userStore.ts ===');
const userResult = checkFile('userStore.ts', [
  { label: 'Imports persist from zustand/middleware', test: (c) => /import\s+\{[^}]*persist[^}]*\}\s+from\s+'zustand\/middleware'/.test(c) },
  { label: 'Imports createJSONStorage from zustand/middleware', test: (c) => /createJSONStorage/.test(c) },
  { label: 'Imports AsyncStorage', test: (c) => /import\s+AsyncStorage\s+from\s+'@react-native-async-storage\/async-storage'/.test(c) },
  { label: 'Uses storage key @runstr:user-store', test: (c) => /@runstr:user-store/.test(c) },
  { label: 'Has schema version constant', test: (c) => /USER_STORE_VERSION\s*=\s*\d+/.test(c) },
  { label: 'Has _hasHydrated flag in state', test: (c) => /_hasHydrated:\s*false/.test(c) },
  { label: 'Partialize includes user and fitnessProfile', test: (c) => {
    const body = getPartializeBody(c);
    return body.includes('user') && body.includes('fitnessProfile');
  }},
  { label: 'Partialize does NOT include isLoadingUser', test: (c) => {
    const body = getPartializeBody(c);
    return !body.includes('isLoadingUser');
  }},
  { label: 'Partialize does NOT include participationStats', test: (c) => {
    const body = getPartializeBody(c);
    return !body.includes('participationStats');
  }},
  { label: 'Has onRehydrateStorage callback', test: (c) => /onRehydrateStorage/.test(c) },
  { label: 'Clears persisted data on reset', test: (c) => /AsyncStorage\.removeItem\(USER_STORE_KEY\)/.test(c) },
  { label: 'Exports useUserStoreHydrated hook', test: (c) => /export\s+const\s+useUserStoreHydrated/.test(c) },
]);

console.log('\n=== teamStore.ts ===');
const teamResult = checkFile('teamStore.ts', [
  { label: 'Imports persist from zustand/middleware', test: (c) => /import\s+\{[^}]*persist[^}]*\}\s+from\s+'zustand\/middleware'/.test(c) },
  { label: 'Imports createJSONStorage from zustand/middleware', test: (c) => /createJSONStorage/.test(c) },
  { label: 'Imports AsyncStorage', test: (c) => /import\s+AsyncStorage\s+from\s+'@react-native-async-storage\/async-storage'/.test(c) },
  { label: 'Uses storage key @runstr:team-store', test: (c) => /@runstr:team-store/.test(c) },
  { label: 'Has schema version constant', test: (c) => /TEAM_STORE_VERSION\s*=\s*\d+/.test(c) },
  { label: 'Has _hasHydrated flag in state', test: (c) => /_hasHydrated:\s*false/.test(c) },
  { label: 'Partialize includes userTeam', test: (c) => {
    const body = getPartializeBody(c);
    return body.includes('userTeam');
  }},
  { label: 'Partialize does NOT include isLoading', test: (c) => {
    const body = getPartializeBody(c);
    return !body.includes('isLoading');
  }},
  { label: 'Has onRehydrateStorage callback', test: (c) => /onRehydrateStorage/.test(c) },
  { label: 'Exports useTeamStoreHydrated hook', test: (c) => /export\s+const\s+useTeamStoreHydrated/.test(c) },
]);

console.log('\n=== Summary ===');
const totalPassed = userResult.passed + teamResult.passed;
const totalFailed = userResult.failed + teamResult.failed;
console.log(`${totalPassed} passed, ${totalFailed} failed`);

if (totalFailed > 0) {
  process.exit(1);
}
