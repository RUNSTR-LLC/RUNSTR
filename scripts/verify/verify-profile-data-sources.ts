/**
 * Verify Profile data sources: kind 0 from Nostr, fallbacks, caching, and profile update flow
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

// --- File existence ---
console.log('\n--- File existence ---');
check('NavigationDataContext.tsx exists', fileExists('src/contexts/NavigationDataContext.tsx'));
check('DirectNostrProfileService.ts exists', fileExists('src/services/user/directNostrProfileService.ts'));
check('NostrProfileService.ts exists', fileExists('src/services/nostr/NostrProfileService.ts'));
check('NostrProfilePublisher.ts exists', fileExists('src/services/nostr/NostrProfilePublisher.ts'));

// --- NavigationDataContext fetches profile from Nostr ---
console.log('\n--- Profile loading via NavigationDataContext ---');
const navCtx = readFile('src/contexts/NavigationDataContext.tsx');
check('Imports DirectNostrProfileService', navCtx.includes('DirectNostrProfileService'));
check('Calls getCurrentUserProfile()', navCtx.includes('getCurrentUserProfile'));
check('Has fetchProfileData function', navCtx.includes('fetchProfileData'));
check('Has forceRefresh path', navCtx.includes('forceRefresh'));

// --- DirectNostrProfileService uses NostrProfileService ---
console.log('\n--- DirectNostrProfileService ---');
const directProfile = readFile('src/services/user/directNostrProfileService.ts');
check('Imports nostrProfileService', directProfile.includes('nostrProfileService'));
check('Gets npub from storage', directProfile.includes('getNpubFromStorage'));

// --- NostrProfileService fetches kind 0 ---
console.log('\n--- NostrProfileService fetches kind 0 ---');
const nostrProfile = readFile('src/services/nostr/NostrProfileService.ts');
check('Queries kind 0 events', nostrProfile.includes('kinds: [0]'));
check('Has getProfile method', nostrProfile.includes('getProfile('));
check('Has cacheProfile method', nostrProfile.includes('cacheProfile('));
check('Parses kind 0 content', nostrProfile.includes('kind 0'));

// --- Fallbacks for missing profile data ---
console.log('\n--- Fallback handling ---');
check('NavigationDataContext has getFallbackProfile', navCtx.includes('getFallbackProfile'));
check('DirectNostrProfileService has getFallbackProfile', directProfile.includes('getFallbackProfile'));

// Fallback fields: name, avatar/picture, lightning address
const profileFields = directProfile;
check('Has name field', profileFields.includes('name:'));
check('Has picture field', profileFields.includes('picture?:'));
check('Has lud16 (lightning address) field', profileFields.includes('lud16?:'));
check('Has displayName field', profileFields.includes('displayName?:'));

// --- Caching ---
console.log('\n--- Profile caching ---');
check('NostrProfileService has profile cache', nostrProfile.includes('cacheProfile'));
check('NavigationDataContext uses UnifiedNostrCache', navCtx.includes('UnifiedNostrCache') || navCtx.includes('unifiedCache'));
check('DirectNostrProfileService uses cache', directProfile.includes('Cache') || directProfile.includes('cache'));

// --- Profile update writes kind 0 back to Nostr ---
console.log('\n--- Profile update flow ---');
check('NostrProfilePublisher exists', fileExists('src/services/nostr/NostrProfilePublisher.ts'));
const publisher = readFile('src/services/nostr/NostrProfilePublisher.ts');
check('Publisher has publishProfileUpdate method', publisher.includes('publishProfileUpdate'));
check('ProfileEditScreen exists', fileExists('src/screens/ProfileEditScreen.tsx'));
const editScreen = readFile('src/screens/ProfileEditScreen.tsx');
check('ProfileEditScreen references profile publishing',
  editScreen.includes('NostrProfilePublisher') ||
  editScreen.includes('publishProfile') ||
  editScreen.includes('updateProfile') ||
  editScreen.includes('ProfilePublisher'));

console.log(`\n=== ${passed}/${passed + failed} checks passed ===`);
process.exit(failed > 0 ? 1 : 0);
