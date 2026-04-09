/**
 * Verify Supabase Workout Submission Flow
 *
 * Checks that all async operations in the submission pipeline
 * are properly timeout-protected and won't hang indefinitely.
 */

import * as fs from 'fs';
import * as path from 'path';

const SRC = path.join(__dirname, '../../src');

interface Check {
  name: string;
  pass: boolean;
  detail: string;
}

const checks: Check[] = [];

function check(name: string, pass: boolean, detail: string) {
  checks.push({ name, pass, detail });
}

// --- Read source files ---

const rewardTags = fs.readFileSync(path.join(SRC, 'utils/rewardTags.ts'), 'utf8');
const localWorkoutStorage = fs.readFileSync(path.join(SRC, 'services/fitness/LocalWorkoutStorageService.ts'), 'utf8');
const supabaseCompetition = fs.readFileSync(path.join(SRC, 'services/backend/SupabaseCompetitionService.ts'), 'utf8');
const imageUpload = fs.readFileSync(path.join(SRC, 'services/media/ImageUploadService.ts'), 'utf8');
const workoutPublishing = fs.readFileSync(path.join(SRC, 'services/nostr/workoutPublishingService.ts'), 'utf8');

// --- 1. rewardTags.ts: getClubLightningAddress has timeout ---

check(
  'getClubLightningAddress() has Promise.race timeout',
  rewardTags.includes('Promise.race') && rewardTags.includes('Timed out fetching club'),
  'getClubLightningAddress must use Promise.race with timeout to prevent hanging'
);

check(
  'buildRewardTags() community team fetch has Promise.race timeout',
  (rewardTags.match(/Promise\.race/g) || []).length >= 2,
  'Both getClubLightningAddress and buildRewardTags community fetch need timeouts'
);

// --- 2. LocalWorkoutStorageService: diagnostic logging ---

check(
  'autoSubmitToSupabase type check has logging',
  localWorkoutStorage.includes("Skipping Supabase submit: type"),
  'Non-cardio type early return must log the workout type'
);

check(
  'autoSubmitToSupabase distance check has logging',
  localWorkoutStorage.includes("Skipping Supabase submit: distance is"),
  'Zero distance early return must log the distance value'
);

check(
  'autoSubmitToSupabase npub check has logging',
  localWorkoutStorage.includes("Skipping Supabase submit: no npub"),
  'Missing npub early return must log a warning'
);

// --- 3. SupabaseCompetitionService: club lookups hoisted ---

// Check that club_id and club_lightning_address are NOT inside await expressions in JSON body
const jsonBodySection = supabaseCompetition.slice(
  supabaseCompetition.indexOf('body: JSON.stringify'),
  supabaseCompetition.indexOf('signal: controller.signal')
);

check(
  'No await in JSON.stringify body for club_id',
  !jsonBodySection.includes('await AsyncStorage.getItem(\'@runstr:club_id\')'),
  'club_id lookup must be hoisted before JSON.stringify body'
);

check(
  'No await in JSON.stringify body for club_lightning_address',
  !jsonBodySection.includes('await getClubLightningAddress()'),
  'club_lightning_address lookup must be hoisted before JSON.stringify body'
);

check(
  'Club data resolved before AbortController',
  supabaseCompetition.indexOf('clubLightningAddress = await getClubLightningAddress()') <
    supabaseCompetition.indexOf('new AbortController()'),
  'Club lookups must happen before AbortController is created'
);

// --- 4. SubscriptionService call has timeout ---

check(
  'SubscriptionService.isSupporterOrAbove() has timeout in submitWorkoutSimple',
  supabaseCompetition.includes('Subscription check timed out'),
  'Subscription check must have a timeout to prevent hanging PPQ flow'
);

// --- 5. workoutPublishingService: relay wait before publish ---

check(
  'waitForMinimumConnection called before publish',
  workoutPublishing.includes('waitForMinimumConnection'),
  'Must wait for relay connections before calling ndkEvent.publish()'
);

check(
  'Publish result relay count is checked',
  workoutPublishing.includes('Published to 0 relays'),
  'Must check that at least 1 relay accepted the event'
);

// --- 6. ImageUploadService: auth signing has timeout ---

check(
  'NIP-98 auth signing has withTimeout',
  imageUpload.includes("'NIP-98 auth signing'"),
  'createNIP98AuthEvent must wrap sign() with withTimeout'
);

check(
  'Blossom auth signing has withTimeout',
  imageUpload.includes("'Blossom auth signing'"),
  'createBlossomAuthEvent must wrap sign() with withTimeout'
);

check(
  'Amber signer detection for serialized uploads',
  imageUpload.includes('AMBER_TIMEOUT_MS') && imageUpload.includes('serializing'),
  'Must detect Amber signer and serialize uploads instead of racing'
);

// --- 7. autoSubmitToSupabase: early returns mark supabaseSubmitted = false ---

check(
  'Distance early return calls updateSupabaseStatus',
  localWorkoutStorage.includes('updateSupabaseStatus(workout.id, false') &&
    localWorkoutStorage.includes('distance is'),
  'Zero distance early return must call updateSupabaseStatus(id, false, reason)'
);

check(
  'No-npub early return calls updateSupabaseStatus',
  localWorkoutStorage.includes("updateSupabaseStatus(workout.id, false, 'No npub"),
  'Missing npub early return must call updateSupabaseStatus(id, false, reason)'
);

// --- 8. buildRewardTags() has top-level timeout in autoSubmitToSupabase ---

check(
  'buildRewardTags() wrapped with timeout in autoSubmitToSupabase',
  localWorkoutStorage.includes('buildRewardTags timed out after'),
  'buildRewardTags() call must be wrapped with Promise.race timeout'
);

// --- 9. PPQ prep block has total timeout ---

check(
  'PPQ prep block has total timeout',
  supabaseCompetition.includes('PPQ prep timed out after'),
  'Entire PPQ prep block must be wrapped with a total timeout'
);

// --- 10. Kind 1 flow uses NDK not nostr-tools ---

check(
  'workoutPublishingService does NOT import nostr-tools',
  !workoutPublishing.includes("from 'nostr-tools'"),
  'Kind 1 posting must use NDK exclusively per CLAUDE.md rules'
);

check(
  'ImageUploadService does NOT import nostr-tools',
  !imageUpload.includes("from 'nostr-tools'"),
  'Image upload auth must use NDK exclusively'
);

// --- Print results ---

console.log('\n=== Supabase Submission Flow Verification ===\n');

let passed = 0;
let failed = 0;

for (const c of checks) {
  const icon = c.pass ? '✅' : '❌';
  console.log(`${icon} ${c.name}`);
  if (!c.pass) {
    console.log(`   DETAIL: ${c.detail}`);
    failed++;
  } else {
    passed++;
  }
}

console.log(`\n${passed} passed, ${failed} failed out of ${checks.length} checks`);

if (failed > 0) {
  process.exit(1);
}
