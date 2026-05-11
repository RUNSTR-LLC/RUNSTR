/**
 * Verify: Daily step display reads from HealthKit (not CMPedometer alone),
 * background sync uses HKStatisticsQuery (no double-count), and the steps
 * screen has a pull-to-refresh affordance.
 *
 * Run: npx tsx scripts/verify/verify-healthkit-step-source.ts
 */

import fs from 'fs';

const FILES = {
  daily: 'src/services/activity/DailyStepCounterService.ts',
  background: 'src/services/fitness/HealthKitBackgroundService.ts',
  screen: 'src/screens/activity/StepsDisplayScreen.tsx',
  statsCard: 'src/components/profile/StatsCard.tsx',
  historyTab: 'src/components/profile/tabs/UnifiedWorkoutsTab.tsx',
};

const src = {
  daily: fs.readFileSync(FILES.daily, 'utf-8'),
  background: fs.readFileSync(FILES.background, 'utf-8'),
  screen: fs.readFileSync(FILES.screen, 'utf-8'),
  statsCard: fs.readFileSync(FILES.statsCard, 'utf-8'),
  historyTab: fs.readFileSync(FILES.historyTab, 'utf-8'),
};

let passed = 0;
let failed = 0;
function assert(name: string, cond: boolean, detail?: string) {
  if (cond) {
    console.log(`  PASS: ${name}`);
    passed++;
  } else {
    console.log(`  FAIL: ${name}${detail ? ' -- ' + detail : ''}`);
    failed++;
  }
}

console.log('\n=== HealthKit Step Source ===\n');

console.log('--- DailyStepCounterService (foreground) ---');
assert(
  'Imports @yzlin/expo-healthkit lazily (iOS only)',
  /Platform\.OS === 'ios'[\s\S]{0,200}require\('@yzlin\/expo-healthkit'\)/.test(src.daily)
);
assert(
  'Calls queryStatisticsForQuantity for step count',
  src.daily.includes('queryStatisticsForQuantity') &&
    src.daily.includes("'HKQuantityTypeIdentifierStepCount'")
);
assert(
  'Uses cumulativeSum option (matches Apple Health daily total)',
  src.daily.includes("'cumulativeSum'")
);
assert(
  'Reads sumQuantity.quantity from result',
  src.daily.includes('sumQuantity?.quantity') ||
    src.daily.includes('sumQuantity.quantity')
);
assert(
  'Preserves CMPedometer fallback (Pedometer.getStepCountAsync still called)',
  src.daily.includes('Pedometer.getStepCountAsync')
);
assert(
  'No misleading "Pedometer (HealthKit)" comments remain',
  !src.daily.includes('Pedometer (HealthKit)')
);

console.log('\n--- HealthKitBackgroundService (background sync) ---');
assert(
  'No longer uses queryQuantitySamples for step sync',
  !src.background.includes('queryQuantitySamples')
);
assert(
  'Uses queryStatisticsForQuantity for step sync',
  src.background.includes('queryStatisticsForQuantity')
);
assert(
  'Uses cumulativeSum option',
  /options:\s*\['cumulativeSum'\]/.test(src.background)
);
assert(
  'Reads sumQuantity.quantity from result',
  src.background.includes('sumQuantity?.quantity') ||
    src.background.includes('sumQuantity.quantity')
);
assert(
  'No naive raw-sample loop summing remains in syncTodaySteps',
  !/totalSteps\s*\+=\s*typeof qty/.test(src.background)
);

console.log('\n--- StepsDisplayScreen (pull-to-refresh) ---');
assert(
  'Uses canonical OstrichRefreshScrollView wrapper',
  src.screen.includes("from '../../components/ui/OstrichRefreshScrollView'") &&
    src.screen.includes('<OstrichRefreshScrollView')
);
assert(
  'Wires refreshing + onRefresh props',
  /<OstrichRefreshScrollView[\s\S]*refreshing=\{refreshing\}[\s\S]*onRefresh=\{handlePullToRefresh\}/m.test(src.screen)
);
assert(
  'Sets alwaysBounceVertical so the gesture triggers when content fits the viewport',
  src.screen.includes('alwaysBounceVertical')
);
assert(
  'Pull-to-refresh clears the cache before re-querying',
  src.screen.includes('dailyStepCounterService.clearCache()')
);

console.log('\n--- StatsCard (History tab daily-step display) ---');
assert(
  'Accepts a refreshKey prop',
  /refreshKey\??:\s*number/.test(src.statsCard)
);
assert(
  'useEffect re-runs when refreshKey changes',
  /useEffect[\s\S]*?\[\s*userPubkey\s*,\s*refreshKey\s*\]/.test(src.statsCard)
);
assert(
  'Clears the daily-step cache on refresh so HealthKit is re-queried',
  src.statsCard.includes('stepService.clearCache()')
);

console.log('\n--- UnifiedWorkoutsTab (History tab pull-to-refresh) ---');
assert(
  'Tracks a statsRefreshKey counter',
  src.historyTab.includes('statsRefreshKey')
);
assert(
  'Bumps the counter inside handleRefresh',
  /handleRefresh[\s\S]*?setStatsRefreshKey\(\(k\)\s*=>\s*k\s*\+\s*1\)/.test(src.historyTab)
);
assert(
  'Passes refreshKey down to StatsCard',
  /<StatsCard[^>]*refreshKey=\{statsRefreshKey\}/.test(src.historyTab)
);
assert(
  'StatsCard is inside the FlatList as ListHeaderComponent (so pull gesture on the card triggers refresh)',
  /ListHeaderComponent=\{[\s\S]*?<StatsCard/m.test(src.historyTab)
);
assert(
  'No StatsCard rendered as a sibling above the FlatList (would make the card unreachable for pull gesture)',
  // The only <StatsCard ...> render should be the one inside ListHeaderComponent.
  (src.historyTab.match(/<StatsCard\b/g) || []).length === 1
);

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
