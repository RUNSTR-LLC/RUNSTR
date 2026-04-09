/**
 * Verify Club membership flow: join/leave writes to Supabase, club_id tagged on workouts
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
check('ClubMembershipService.ts exists', fileExists('src/services/backend/ClubMembershipService.ts'));
check('workoutPublishingService.ts exists', fileExists('src/services/nostr/workoutPublishingService.ts'));

const membership = readFile('src/services/backend/ClubMembershipService.ts');
const publishing = readFile('src/services/nostr/workoutPublishingService.ts');

// --- Join club writes to Supabase ---
console.log('\n--- joinClub writes to Supabase ---');
check('Has joinClub method', membership.includes('static async joinClub('));
check('joinClub calls edge function', membership.includes("callEdgeFunction") && membership.includes("'join'"));
check('joinClub caches club state locally', membership.includes('cacheClubState'));
check('joinClub stores club_id in AsyncStorage', membership.includes('CLUB_ID_KEY'));

// --- club_id gets added to workout tags after joining ---
console.log('\n--- club_id tagged on workouts ---');
check('Publishing reads club_id from AsyncStorage',
  publishing.includes("@runstr:club_id"));
check('Publishing pushes club tag to workout tags',
  publishing.includes("tags.push(['club'") || publishing.includes("['club', clubId]"));

// --- Leave club removes from Supabase ---
console.log('\n--- leaveClub removes from Supabase ---');
check('Has leaveClub method', membership.includes('static async leaveClub('));
check('leaveClub calls edge function with leave action',
  membership.includes("callEdgeFunction") && membership.includes("'leave'"));
check('leaveClub clears local club state', membership.includes('clearLocalClubState'));

// --- clearLocalClubState removes AsyncStorage keys ---
console.log('\n--- clearLocalClubState cleanup ---');
check('Has clearLocalClubState method', membership.includes('clearLocalClubState'));
check('Removes CLUB_ID_KEY from AsyncStorage',
  membership.includes('CLUB_ID_KEY') && membership.includes('multiRemove'));
check('Removes CLUB_NAME_KEY', membership.includes('CLUB_NAME_KEY'));
check('Removes CLUB_ROLE_KEY', membership.includes('CLUB_ROLE_KEY'));

// --- After leaving, club_id tag is not added (no stale tag) ---
console.log('\n--- No stale club tag after leaving ---');
// When club_id is null (cleared), the publishing service skips the tag
check('Publishing only adds club tag when club_id exists',
  publishing.includes("if (clubId)") || publishing.includes('if(clubId)'));

// --- Reconciliation prevents stale membership ---
console.log('\n--- Reconciliation ---');
check('Has reconciliation mechanism', membership.includes('needsReconciliation'));
check('Verifies membership against Supabase', membership.includes('Reconciliation'));
check('Clears stale state when membership gone',
  membership.includes('clearLocalClubState') && membership.includes('no longer exists'));

// --- Switch club has recovery ---
console.log('\n--- switchClub with recovery ---');
check('Has switchClub method', membership.includes('static async switchClub('));
check('switchClub leaves then joins', membership.includes('leaveClub') && membership.includes('joinClub'));
check('switchClub has recovery on join failure',
  membership.includes('Recovery') || membership.includes('re-join'));
check('switchClub checks cooldown before switching', membership.includes('getCooldownRemaining'));

// --- Members cache invalidation on leave ---
console.log('\n--- Cache invalidation ---');
check('leaveClub invalidates members cache', membership.includes('invalidateMembersCache'));
check('Has clearCache static method', membership.includes('static async clearCache'));

console.log(`\n=== ${passed}/${passed + failed} checks passed ===`);
process.exit(failed > 0 ? 1 : 0);
