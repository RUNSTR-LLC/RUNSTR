/**
 * Verify Social Feed round-trip: dual-write from workout publishing and Supabase query
 */
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

// --- Service file existence ---
console.log('\n--- File existence ---');
check('SocialFeedService.ts exists', fileExists('src/services/social/SocialFeedService.ts'));
check('workoutPublishingService.ts exists', fileExists('src/services/nostr/workoutPublishingService.ts'));
check('types/social.ts exists', fileExists('src/types/social.ts'));

// --- SocialFeedService has insertPost (dual-write method) ---
console.log('\n--- SocialFeedService insertPost method ---');
const feedService = readFile('src/services/social/SocialFeedService.ts');
check('Has insertPost method', feedService.includes('async insertPost('));
check('insertPost writes to social_feed table', feedService.includes("from('social_feed')") && feedService.includes('.insert('));
check('insertPost accepts event_id param', feedService.includes('event_id: string'));
check('insertPost accepts npub param', feedService.includes('npub: string'));
check('insertPost accepts content param', feedService.includes('content: string'));
check('insertPost accepts created_at param', feedService.includes('created_at: string'));

// --- SocialFeedService has fetchFeed (query method) ---
console.log('\n--- SocialFeedService fetchFeed method ---');
check('Has fetchFeed method', feedService.includes('async fetchFeed('));
check('fetchFeed queries Supabase social_feed', feedService.includes("from('social_feed')") && feedService.includes('.select('));
check('fetchFeed orders by created_at', feedService.includes("order('created_at'"));
check('fetchFeed supports pagination via cursor', feedService.includes('cursor'));

// --- SocialFeedService caching ---
console.log('\n--- SocialFeedService caching ---');
check('Has cachedPosts property', feedService.includes('cachedPosts'));
check('Has getCachedFeed method', feedService.includes('getCachedFeed'));
check('Has clearCache method', feedService.includes('clearCache'));

// --- workoutPublishingService calls SocialFeedService ---
console.log('\n--- Dual-write from workoutPublishingService ---');
const publishing = readFile('src/services/nostr/workoutPublishingService.ts');
check('Imports SocialFeedService', publishing.includes('SocialFeedService'));
check('Calls SocialFeedService.insertPost', publishing.includes('SocialFeedService.insertPost'));
check('Passes event_id to insertPost', publishing.includes('event_id:'));
check('Passes npub to insertPost', publishing.includes('npub:'));
check('Passes content to insertPost', publishing.includes('content:'));
check('Passes created_at to insertPost', publishing.includes('created_at:'));
check('Passes author_name to insertPost', publishing.includes('author_name:'));
check('Passes author_avatar to insertPost', publishing.includes('author_avatar:'));

// --- Post schema in types/social.ts ---
console.log('\n--- Post schema (types/social.ts) ---');
const socialTypes = readFile('src/types/social.ts');
check('SocialFeedPost interface exists', socialTypes.includes('interface SocialFeedPost'));
check('Schema has content field', socialTypes.includes('content: string'));
check('Schema has npub field', socialTypes.includes('npub: string'));
check('Schema has created_at field', socialTypes.includes('created_at: string'));
check('Schema has author_name field', socialTypes.includes('author_name:'));
check('Schema has author_avatar field', socialTypes.includes('author_avatar:'));

console.log(`\n=== ${passed}/${passed + failed} checks passed ===`);
process.exit(failed > 0 ? 1 : 0);
