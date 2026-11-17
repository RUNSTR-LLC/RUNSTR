/**
 * Verifies a failed or empty profile fetch never signs the user out.
 * Bug: after a long time away the 24h profile cache had expired, the cold-start
 * relay fetch timed out, and loadUserProfile set isAuthenticated(false).
 *
 * Run: npx tsx scripts/verify/verify-stay-signed-in.ts
 */
import { readFileSync } from 'fs';
import { CacheTTL } from '../../src/constants/cacheTTL';

let failures = 0;
const check = (ok: boolean, label: string) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok) failures++;
};

const auth = readFileSync('src/contexts/AuthContext.tsx', 'utf8');
const start = auth.indexOf('const loadUserProfile = async');
const load = auth.slice(start, auth.indexOf('const refreshProfileInBackground', start));
check(start > 0 && !load.includes('setIsAuthenticated(false)'), 'loadUserProfile never signs the user out');
check(!load.includes('setInitError'), 'a failed profile fetch does not show the init error screen');

// Only missing keys (no npub / hex pubkey) or a storage error may sign out on launch
const check0 = auth.slice(auth.indexOf('const checkStoredCredentials'), start);
check((check0.match(/setIsAuthenticated\(false\)/g) || []).length === 4, 'launch signs out only when keys are missing or unreadable');

check(CacheTTL.USER_PROFILE >= 7 * 24 * 60 * 60 * 1000, `profile copy kept at least a week (${CacheTTL.USER_PROFILE / 86400000} days)`);
const direct = readFileSync('src/services/user/directNostrProfileService.ts', 'utf8');
check(!direct.includes('24 * 60 * 60 * 1000'), 'profile service uses the shared TTL');

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
