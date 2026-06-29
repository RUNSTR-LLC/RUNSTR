/**
 * Verifies the three v1.9.9 bug fixes:
 *  1. nsec login no longer hard-fails when the kind-0 profile can't be fetched
 *     (relay timeout / no published profile) — signs in with a minimal profile.
 *  2. Reward-notification tap routes to the 'Rewards' stack screen directly
 *     (was a no-op via the mis-nested MainTabs route).
 *  3. A failed recordZap reverts the optimistic zap count (both the NWC quick-zap
 *     and the external-zap-modal paths).
 *
 * Run: npx tsx scripts/verify/verify-199-bugfixes.ts
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '../..');
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8');

let pass = 0;
let fail = 0;
const ok = (name: string, cond: boolean) => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}`); }
};

console.log('\n[1] nsec login lockout fix');
const auth = read('src/services/auth/providers/nostrAuthProvider.ts');
ok('no longer returns "Failed to load Nostr profile data"', !auth.includes('Failed to load Nostr profile data'));
ok('builds a minimal fallback user from npub', auth.includes("name: 'RUNSTR User'") && /id: npub/.test(auth));
ok('still returns success: true for the happy path', auth.includes('success: true'));

console.log('\n[2] reward-notification tap routes to Rewards');
const notif = read('src/services/notifications/ExpoNotificationProvider.ts');
ok('no longer navigates into MainTabs for rewards', !notif.includes("navigate('MainTabs', { screen: 'Rewards' })"));
ok("navigates to 'Rewards' directly", notif.includes("navigate('Rewards')"));

console.log('\n[3] zap count reverts on recordZap failure');
const row = read('src/components/social/SocialInteractionRow.tsx');
// The empty catch that swallowed failures without reverting must be gone.
ok('external-zap-modal path no longer has an empty .catch(() => {})',
  !/recordZap\([^)]*\)\.catch\(\(\) => \{\}\)/.test(row));
// Both failure handlers revert with Math.max(z - <amount>, 0).
ok('external-zap-modal path reverts amountSats',
  /\.catch\(\(\) => \{[\s\S]*?Math\.max\(z - amountSats, 0\)[\s\S]*?\}\)/.test(row));
ok('NWC quick-zap path reverts defaultZapAmount on record failure',
  /try \{[\s\S]*?recordZap\([\s\S]*?\} catch \{[\s\S]*?Math\.max\(z - defaultZapAmount, 0\)[\s\S]*?\}/.test(row));

console.log(`\nResult: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
