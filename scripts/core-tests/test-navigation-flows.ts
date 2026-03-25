/**
 * Test: Navigation Flow Smoke Test Checklist
 * Run: npx tsx scripts/core-tests/test-navigation-flows.ts
 *
 * Prints a structured manual smoke test checklist for all critical user flows.
 * Designed for a tester running the app on a real device (iOS or Android).
 *
 * Also validates source files to ensure screens and components exist.
 */

import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Test harness
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

function assert(name: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  PASS: ${name}`);
    passed++;
  } else {
    console.log(`  FAIL: ${name}${detail ? ' -- ' + detail : ''}`);
    failed++;
  }
}

// ---------------------------------------------------------------------------
// Screen/component existence checks
// ---------------------------------------------------------------------------

function checkFileExists(relativePath: string): boolean {
  return fs.existsSync(path.join(__dirname, '../../src', relativePath));
}

function runScreenExistenceChecks() {
  console.log('\n=== Screen file existence checks ===\n');

  const criticalScreens = [
    'screens/LoginScreen.tsx',
    'screens/TeamsScreen.tsx',
  ];

  for (const screen of criticalScreens) {
    assert(`${screen} exists`, checkFileExists(screen));
  }

  const criticalComponents = [
    'components/activity/',
    'components/club/',
    'components/rewards/',
    'components/profile/',
    'components/compete/',
  ];

  for (const comp of criticalComponents) {
    const fullPath = path.join(__dirname, '../../src', comp);
    assert(`${comp} directory exists`, fs.existsSync(fullPath));
  }

  // Check navigation configuration exists
  const navFiles = [
    'navigation/',
  ];

  for (const nav of navFiles) {
    const fullPath = path.join(__dirname, '../../src', nav);
    assert(`${nav} directory exists`, fs.existsSync(fullPath));
  }
}

// ---------------------------------------------------------------------------
// Print the manual smoke test checklist
// ---------------------------------------------------------------------------

function printChecklist() {
  console.log('\n');
  console.log('='.repeat(70));
  console.log('  MANUAL SMOKE TEST CHECKLIST');
  console.log('  Run through these on a real device after every release build');
  console.log('='.repeat(70));

  const sections = [
    {
      title: '1. ONBOARDING / AUTH',
      items: [
        'Fresh install: app opens to login screen',
        'Tap "Start" - anonymous identity is generated',
        'User is taken to the destination picker (Teams screen)',
        'Advanced login: enter nsec (shown as "Password") - identity loads',
        'Advanced login: Amber signer flow works (Android only)',
        'After auth, Profile tab is the default landing screen',
      ],
    },
    {
      title: '2. THREE-TAB NAVIGATION',
      items: [
        'Profile tab is visible and tappable',
        'Clubs tab is visible and tappable',
        'Rewards tab is visible and tappable',
        'Swiping between tabs works smoothly',
        'Tab icons highlight correctly for active tab',
        'Deep links open the correct tab (if applicable)',
      ],
    },
    {
      title: '3. PROFILE TAB',
      items: [
        'Profile picture and display name load (or show defaults)',
        'Workout history list loads (may be empty for new users)',
        'Tapping a workout opens workout detail view',
        'Settings gear icon is accessible',
        'Settings: Lightning address input works',
        'Settings: reward destination picker opens',
        'Settings: sign out works and returns to login',
      ],
    },
    {
      title: '4. WORKOUT TRACKING (Cardio)',
      items: [
        'Start a GPS run - map appears with location dot',
        'Distance, pace, and timer update in real-time',
        'Pause/resume works without resetting stats',
        'Stop workout - summary screen appears',
        'Workout saves to local history',
        'Workout submits to Supabase (check console logs or network)',
        'Walk, Cycle, Hike activities also start correctly',
      ],
    },
    {
      title: '5. WORKOUT TRACKING (Strength)',
      items: [
        'Start pushups - rep counter appears',
        'Manual rep input works',
        'Timer-based exercises (plank) work',
        'Stop workout - summary shows reps/sets',
        'Pull-ups, Sit-ups, Squats, Curls, Bench all accessible',
      ],
    },
    {
      title: '6. WORKOUT TRACKING (Wellness / Mindfulness)',
      items: [
        'Guided meditation starts with audio (if available)',
        'Unguided meditation timer works',
        'Breathwork animation plays correctly',
        'Body scan flow works',
        'Gratitude journal text input saves',
        'Journal entries appear in history',
        'Habit tracking toggle works',
      ],
    },
    {
      title: '7. BACKGROUND SYNC',
      items: [
        'iOS: HealthKit permission prompt appears on first use',
        'iOS: Workouts from Apple Watch/Health appear in history',
        'Android: Health Connect permission prompt appears',
        'Android: Background WorkManager triggers every ~15 min',
        'Synced workouts auto-submit to Supabase without opening app',
        'Synced workouts auto-trigger rewards',
        'No duplicate workouts from background sync',
      ],
    },
    {
      title: '8. REWARDS TAB',
      items: [
        'Reward earnings display (total earned, recent)',
        'Current destination shows correct charity/project/self',
        'Destination picker: can switch between charity/project/service/self',
        'Sponsor banner displays (Zapvertising)',
        'Reward amount reflects subscription tier (Free vs Supporter vs Pro)',
        'After workout, reward toast/notification appears',
      ],
    },
    {
      title: '9. COMPETITIONS',
      items: [
        'Daily leaderboard loads (5K, 10K, Half, Marathon, Steps tabs)',
        'User ranking appears if they have qualifying workouts',
        'Featured events load from Supabase',
        'Joining an event works (Join button)',
        'Club events appear (if user is in a club)',
        'Leaderboard positions update after new workout submission',
      ],
    },
    {
      title: '10. FITNESS CLUBS',
      items: [
        'Clubs tab loads club list (or "no clubs" state)',
        'Creating a club works (Pro subscription required)',
        'Club page shows: leaderboard, chat, member list',
        'Real-time chat: sending a message appears immediately',
        'Real-time chat: receiving messages from others works',
        'Captain can create club events from templates',
        'Club leaderboard updates with member workouts',
        'Joining/leaving a club works',
      ],
    },
    {
      title: '11. EDGE CASES & ERROR HANDLING',
      items: [
        'No internet: app launches without crashing',
        'No internet: cached data displays correctly',
        'Switch between WiFi and cellular mid-workout',
        'Background the app during a workout - workout continues',
        'Force-kill and reopen - no data loss',
        'Very long workout (2+ hours) - no timer drift',
        'Multiple rapid workout starts/stops - no crash',
      ],
    },
    {
      title: '12. PLATFORM-SPECIFIC',
      items: [
        'iOS: Notifications permission prompt',
        'iOS: Location permission (When In Use for GPS)',
        'iOS: Background location for GPS workouts',
        'Android: POST_NOTIFICATIONS permission (Android 13+)',
        'Android: Foreground service notification during workout',
        'Android: Battery optimization warning/handling',
        'Both: App icon and splash screen display correctly',
      ],
    },
  ];

  for (const section of sections) {
    console.log(`\n${section.title}`);
    console.log('-'.repeat(section.title.length));
    for (const item of section.items) {
      console.log(`  [ ] ${item}`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('  END OF CHECKLIST');
  console.log('  Total items: ' + sections.reduce((sum, s) => sum + s.items.length, 0));
  console.log('='.repeat(70));
  console.log('');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  console.log('\n=== Navigation Flow Tests ===');

  runScreenExistenceChecks();

  console.log(`\n=== Automated checks: ${passed} passed, ${failed} failed ===`);

  printChecklist();

  // This test always passes (checklist is informational), unless screens are missing
  process.exit(failed > 0 ? 1 : 0);
}

main();
