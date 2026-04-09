/**
 * Verify Social Tab implementation
 */
import * as fs from 'fs';
import * as path from 'path';
import { timeAgo } from '../../src/types/social';

const ROOT = path.resolve(__dirname, '../..');
let passed = 0;
let failed = 0;

function check(name: string, condition: boolean) {
  if (condition) { console.log(`  PASS: ${name}`); passed++; }
  else { console.log(`  FAIL: ${name}`); failed++; }
}

function readFile(p: string) { return fs.readFileSync(path.join(ROOT, p), 'utf-8'); }
function fileExists(p: string) { return fs.existsSync(path.join(ROOT, p)); }

console.log('\n--- File existence ---');
check('types/social.ts', fileExists('src/types/social.ts'));
check('SocialFeedService.ts', fileExists('src/services/social/SocialFeedService.ts'));
check('ClubsRow.tsx', fileExists('src/components/social/ClubsRow.tsx'));
check('SocialFeedPost.tsx', fileExists('src/components/social/SocialFeedPost.tsx'));
check('SocialScreen.tsx', fileExists('src/screens/SocialScreen.tsx'));
check('migration 159', fileExists('supabase/migrations/159_social_feed.sql'));

console.log('\n--- Navigation ---');
const nav = readFile('src/navigation/BottomTabNavigator.tsx');
check('Social in BottomTabParamList', nav.includes('Social'));
check('No Clubs in ParamList', !nav.match(/Clubs\s*:/));
check('chatbubbles icon', nav.includes('chatbubbles'));
check('SocialScreen imported', nav.includes('SocialScreen'));

console.log('\n--- No stale Clubs references ---');
const appNav = readFile('src/navigation/AppNavigator.tsx');
const handlers = readFile('src/navigation/navigationHandlers.ts');
const notif = readFile('src/components/profile/NotificationModal.tsx');
check('AppNavigator: no navigate Clubs', !appNav.includes("navigate('Clubs')"));
check('Handlers: no navigate Clubs', !handlers.includes("navigate('Clubs')"));
check('NotificationModal: no navigate Clubs', !notif.includes("navigate('Clubs')"));

console.log('\n--- Dual-write ---');
const publish = readFile('src/services/nostr/workoutPublishingService.ts');
check('SocialFeedService imported', publish.includes('SocialFeedService'));
check('insertPost called', publish.includes('insertPost'));

console.log('\n--- CLAUDE.md updated ---');
const claude = readFile('CLAUDE.md');
check('CLAUDE.md says Social', claude.includes('Social'));

console.log('\n--- timeAgo function ---');
check('timeAgo: now', timeAgo(new Date().toISOString()) === 'now');
check('timeAgo: minutes', timeAgo(new Date(Date.now() - 300000).toISOString()) === '5m ago');
check('timeAgo: hours', timeAgo(new Date(Date.now() - 7200000).toISOString()) === '2h ago');

console.log(`\n=== ${passed}/${passed + failed} checks passed ===`);
process.exit(failed > 0 ? 1 : 0);
