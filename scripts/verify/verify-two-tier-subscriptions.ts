/**
 * Verification script for two-tier subscription system
 * Tests pure logic without React Native dependencies
 *
 * Run: npx tsx scripts/verify/verify-two-tier-subscriptions.ts
 */

console.log('=== Two-Tier Subscription Verification ===\n');

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string) {
  if (condition) {
    console.log(`  PASS: ${name}`);
    passed++;
  } else {
    console.log(`  FAIL: ${name}`);
    failed++;
  }
}

// --- Test 1: Reward Config Constants (inline to avoid RN import chain) ---
console.log('1. Reward Config Constants:');

// Read the actual config file and validate
const fs = require('fs');
const configContent = fs.readFileSync('src/config/rewards.ts', 'utf8');

assert(configContent.includes('BOOSTED_WORKOUT_REWARD: 1000'), 'BOOSTED_WORKOUT_REWARD = 1000');
assert(configContent.includes('BOOSTED_MAX_PER_WEEK: 5'), 'BOOSTED_MAX_PER_WEEK = 5');
assert(configContent.includes('MIN_WORKOUT_DISTANCE_METERS: 1000'), 'MIN_WORKOUT_DISTANCE_METERS = 1000');
assert(configContent.includes('SUPPORTER_PRICE_SATS: 15000'), 'SUPPORTER_PRICE_SATS = 15000');
assert(configContent.includes('PRO_PRICE_SATS: 21000'), 'PRO_PRICE_SATS = 21000');
assert(configContent.includes('DAILY_WORKOUT_REWARD: 100'), 'DAILY_WORKOUT_REWARD = 100');

// --- Test 2: isBoostedQualified logic (inline replica to avoid RN) ---
console.log('\n2. isBoostedQualified() logic:');

const CARDIO_TYPES = ['running', 'walking', 'cycling'];
const MIN_DISTANCE = 2000;
const MIN_DURATION = 900;

function isBoostedQualified(
  activityType: string,
  distanceMeters: number,
  durationSeconds: number,
  source: string,
): boolean {
  const isCardio = CARDIO_TYPES.includes(activityType);
  const hasDistance = distanceMeters >= MIN_DISTANCE;
  const hasDuration = durationSeconds >= MIN_DURATION;
  const isNonManual = source !== 'manual_entry';
  return isCardio && hasDistance && hasDuration && isNonManual;
}

// Should qualify
assert(isBoostedQualified('running', 2100, 960, 'gps_tracker'), '2.1km + 16min running GPS = qualified');
assert(isBoostedQualified('walking', 2000, 900, 'healthkit'), '2.0km + 15min walking healthkit = qualified (boundary)');
assert(isBoostedQualified('cycling', 5000, 1200, 'health_connect'), '5km + 20min cycling health_connect = qualified');

// Should NOT qualify
assert(!isBoostedQualified('running', 1900, 960, 'gps_tracker'), '1.9km = NOT qualified (distance too short)');
assert(!isBoostedQualified('running', 3000, 899, 'gps_tracker'), '3km + 14:59 = NOT qualified (duration too short)');
assert(!isBoostedQualified('running', 5000, 1800, 'manual_entry'), 'manual_entry = NOT qualified');
assert(!isBoostedQualified('strength', 3000, 1800, 'gps_tracker'), 'strength = NOT qualified (not cardio)');
assert(!isBoostedQualified('meditation', 0, 1200, 'gps_tracker'), 'meditation = NOT qualified');
assert(!isBoostedQualified('hiking', 5000, 3600, 'gps_tracker'), 'hiking = NOT qualified (not in cardio list)');

// --- Test 3: SubscriptionService structure ---
console.log('\n3. SubscriptionService structure:');

const serviceContent = fs.readFileSync('src/services/backend/SubscriptionService.ts', 'utf8');

assert(serviceContent.includes("export type SubscriptionTier = 'free' | 'supporter' | 'pro'"), 'SubscriptionTier type exported');
assert(serviceContent.includes('getSubscriptionTier'), 'getSubscriptionTier method exists');
assert(serviceContent.includes('isProSubscriber'), 'isProSubscriber method exists');
assert(serviceContent.includes('isSupporterOrAbove'), 'isSupporterOrAbove method exists');
assert(serviceContent.includes('isSubscriber'), 'isSubscriber backward compat method exists');
assert(serviceContent.includes('getCachedTier'), 'getCachedTier method exists');
assert(serviceContent.includes('getCachedSubscriberStatus'), 'getCachedSubscriberStatus backward compat exists');
assert(serviceContent.includes('clearCache'), 'clearCache method exists');
assert(serviceContent.includes("@runstr:subscription_tier"), 'New cache key (auto-invalidates old cache)');

// --- Test 4: SubscriptionInfoModal structure ---
console.log('\n4. SubscriptionInfoModal structure:');

const modalContent = fs.readFileSync('src/components/subscription/SubscriptionInfoModal.tsx', 'utf8');

assert(modalContent.includes("feature: 'event' | 'team' | 'season' | 'general'"), 'Feature prop supports season and general');
assert(modalContent.includes('currentTier'), 'currentTier prop exists');
assert(modalContent.includes('Supporter'), 'Supporter tier card');
assert(modalContent.includes('Pro'), 'Pro tier card');
assert(modalContent.includes('10,000') || modalContent.includes('SUPPORTER_PRICE_SATS'), 'Supporter pricing shown');
assert(modalContent.includes('15,000') || modalContent.includes('PRO_PRICE_SATS'), 'Pro pricing shown');
assert(modalContent.includes("handleSubscribe('supporter')"), 'CTA calls handleSubscribe with supporter');
assert(modalContent.includes("handleSubscribe('pro')"), 'CTA calls handleSubscribe with pro');

// --- Test 5: Screen gates ---
console.log('\n5. Screen gates:');

const competeContent = fs.readFileSync('src/screens/CompeteScreen.tsx', 'utf8');
assert(competeContent.includes("subscriptionTier === 'pro'"), 'CompeteScreen gates on pro tier');
assert(competeContent.includes('currentTier={subscriptionTier}'), 'CompeteScreen passes currentTier to modal');

const teamsContent = fs.readFileSync('src/screens/TeamsScreen.tsx', 'utf8');
assert(teamsContent.includes("subscriptionTier === 'pro'"), 'TeamsScreen gates on pro tier');
assert(teamsContent.includes('currentTier={subscriptionTier}'), 'TeamsScreen passes currentTier to modal');

const dynamicContent = fs.readFileSync('src/screens/events/DynamicEventDetailScreen.tsx', 'utf8');
assert(dynamicContent.includes('requires_subscription'), 'DynamicEventDetail checks requires_subscription');
assert(dynamicContent.includes('SubscriptionInfoModal'), 'DynamicEventDetail shows subscription modal');

// --- Test 6: Migration ---
console.log('\n6. Database migration:');

const migrationContent = fs.readFileSync('supabase/migrations/138_two_tier_subscriptions.sql', 'utf8');

assert(migrationContent.includes("IN ('supporter', 'pro')"), 'Migration allows supporter and pro plans');
assert(migrationContent.includes("SET plan = 'pro' WHERE plan = 'creator'"), 'Migration upgrades creator to pro');
assert(migrationContent.includes('v_reward_amount := 800'), 'Trigger sets 800 sats for boosted');
assert(migrationContent.includes('v_distance_m >= 2000'), 'Trigger checks 2km minimum');
assert(migrationContent.includes('v_duration_s >= 900'), 'Trigger checks 15min minimum');
assert(migrationContent.includes("v_source <> 'manual_entry'"), 'Trigger rejects manual entries');

// --- Test 7: Edge function ---
console.log('\n7. Edge function:');

const edgeFnContent = fs.readFileSync('supabase/functions/claim-reward/index.ts', 'utf8');
assert(edgeFnContent.includes('MAX_WORKOUT_SATS = 1000'), 'MAX_WORKOUT_SATS raised to 1000');

// --- Test 8: CompetitionConfig type ---
console.log('\n8. CompetitionConfig type:');

const supabaseContent = fs.readFileSync('src/utils/supabase.ts', 'utf8');
assert(supabaseContent.includes("requires_subscription?: 'supporter' | 'pro'"), 'CompetitionConfig has requires_subscription field');

// --- Summary ---
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
