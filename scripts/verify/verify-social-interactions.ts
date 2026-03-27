import * as fs from 'fs';
import * as path from 'path';

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
check('SocialInteractionRow', fileExists('src/components/social/SocialInteractionRow.tsx'));
check('SocialInteractionService', fileExists('src/services/social/SocialInteractionService.ts'));
check('Migration 161', fileExists('supabase/migrations/161_social_feed_interactions.sql'));

console.log('\n--- Types updated ---');
const types = readFile('src/types/social.ts');
check('like_count field', types.includes('like_count'));
check('repost_count field', types.includes('repost_count'));
check('zap_total field', types.includes('zap_total'));
check('liked_by field', types.includes('liked_by'));
check('reposted_by field', types.includes('reposted_by'));

console.log('\n--- Integration ---');
const feedPost = readFile('src/components/social/SocialFeedPost.tsx');
check('SocialInteractionRow imported', feedPost.includes('SocialInteractionRow'));
check('userNpub prop', feedPost.includes('userNpub'));

console.log('\n--- LightningZapService eventId ---');
const zapService = readFile('src/services/nutzap/LightningZapService.ts');
check('eventId parameter', zapService.includes('eventId'));

console.log('\n--- Service methods ---');
const service = readFile('src/services/social/SocialInteractionService.ts');
check('toggleLike method', service.includes('toggleLike'));
check('repost method', service.includes('async repost'));
check('zap method', service.includes('async zap'));
check('Kind 7 publish', service.includes('kind = 7') || service.includes('kind: 7'));
check('Kind 6 publish', service.includes('kind = 6') || service.includes('kind: 6'));

console.log('\n--- UI icons ---');
const row = readFile('src/components/social/SocialInteractionRow.tsx');
check('heart icon', row.includes('heart-outline'));
check('flash icon', row.includes('flash-outline'));
check('repeat icon', row.includes('repeat-outline'));
check('chatbubble icon', row.includes('chatbubble-outline'));

console.log(`\n=== ${passed}/${passed + failed} checks passed ===`);
process.exit(failed > 0 ? 1 : 0);
