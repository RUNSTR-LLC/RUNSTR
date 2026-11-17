/**
 * Verifies the "basics only" surface: sign in with Nostr, track a run, keep
 * history locally and on Nostr, share runs with an AI agent via npub.
 * Static checks only.
 *
 * Run: npx tsx scripts/verify/verify-basics-surface.ts
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join } from 'path';
import { FEATURES } from '../../src/config/features';

let failures = 0;
const check = (ok: boolean, label: string) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok) failures++;
};

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(p) ? [p] : [];
  });
const files = walk('src');
const all = files.map((f) => readFileSync(f, 'utf8')).join('\n');

// Routes: exactly the live surface
const app = readFileSync('src/App.tsx', 'utf8');
const routes = [...app.matchAll(/<AuthenticatedStack\.Screen[\s\S]*?name="(\w+)"/g)].map((m) => m[1]).sort();
const expected = ['HelpSupport', 'MainTabs', 'PrivacyPolicy', 'ProfileEdit', 'Settings', 'WorkoutHistory'];
check(JSON.stringify(routes) === JSON.stringify(expected), `routes are exactly ${expected.join(', ')}`);

// Removed feature areas stay removed
for (const dir of [
  'src/components/music', 'src/services/music', 'src/components/wallet', 'src/services/wallet',
  'src/services/wot', 'src/services/team', 'src/services/verification', 'src/components/debug',
  'src/screens/routes', 'src/components/cards',
]) {
  check(!existsSync(dir), `${dir} is gone`);
}
for (const needle of [
  'Wavlake', 'NWCStorageService', 'NWCWalletService', 'WoTService', 'TeamMembershipService',
  'VerificationService', 'WorkoutCardGenerator', 'NostrCompetitionService', 'AppleAuthProvider',
  'EXPO_PUBLIC_SUPABASE', 'supabase.co',
]) {
  check(!all.includes(needle), `no reference to ${needle} in src`);
}

// Flags: only the two still read
check(JSON.stringify(Object.keys(FEATURES).sort()) === JSON.stringify(['nonRunningHistory', 'stepTracking']), 'features.ts holds only live flags');

// Settings: Nostr is named, agent sharing uses the npub only
const keys = readFileSync('src/components/settings/PasswordSection.tsx', 'utf8');
const state = readFileSync('src/screens/useSettingsState.ts', 'utf8');
check(keys.includes('Share runs with your AI agent'), 'Settings offers "Share runs with your AI agent"');
const agent = state.slice(state.indexOf('handleCopyAgentPrompt'), state.indexOf('return {'));
check(agent.includes('userNpub') && !agent.includes('userNsec'), 'agent prompt copies the npub, never the nsec');
check(readFileSync('src/components/settings/NostrPostingSection.tsx', 'utf8').includes('Publish runs to Nostr'), 'publish toggle says "Nostr"');
check(/SecureNsecStorage\.clearNsec\(\);\s*await AsyncStorage\.clear\(\)/.test(state), 'Delete Account removes the nsec from secure storage');

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
