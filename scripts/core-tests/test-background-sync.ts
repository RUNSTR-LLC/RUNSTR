/**
 * Test: Background Sync Pipeline
 * Run: npx tsx scripts/core-tests/test-background-sync.ts
 *
 * Tests the background sync pipeline for HealthKit (iOS) and Health Connect (Android).
 * Verifies source file structure, workout normalization, deduplication logic,
 * background task registration, and auto-submit paths by reading source code.
 *
 * Does NOT require a device — inspects source patterns and validates architecture.
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
// Test 1: Required source files exist
// ---------------------------------------------------------------------------

function testRequiredFilesExist() {
  console.log('\n=== Required source files ===\n');

  const srcRoot = path.join(__dirname, '../../src');

  const requiredFiles = [
    'services/fitness/healthKitService.ts',
    'services/fitness/healthConnectService.ts',
    'services/fitness/HealthKitBackgroundService.ts',
    'services/fitness/HealthKitBackgroundTask.ts',
    'services/fitness/LocalWorkoutStorageService.ts',
    'services/fitness/AndroidBackgroundSyncTask.ts',
    'services/fitness/BackgroundSyncRegistration.ts',
  ];

  for (const file of requiredFiles) {
    const fullPath = path.join(srcRoot, file);
    assert(`${file} exists`, fs.existsSync(fullPath));
  }
}

// ---------------------------------------------------------------------------
// Test 2: HealthKitService exports and patterns
// ---------------------------------------------------------------------------

function testHealthKitService() {
  console.log('\n=== HealthKitService patterns ===\n');

  const srcRoot = path.join(__dirname, '../../src');
  const src = fs.readFileSync(
    path.join(srcRoot, 'services/fitness/healthKitService.ts'),
    'utf8'
  );

  assert(
    'HealthKitService has getRecentWorkouts method',
    src.includes('async getRecentWorkouts(')
  );

  assert(
    'HealthKitService has syncWorkouts method',
    src.includes('async syncWorkouts(')
  );

  assert(
    'HealthKitService uses singleton pattern',
    src.includes('static getInstance()')
  );

  // Workout type mapping covers core cardio types
  assert(
    'HK_WORKOUT_TYPE_MAP maps running (37)',
    src.includes("37: 'running'")
  );

  assert(
    'HK_WORKOUT_TYPE_MAP maps walking (52)',
    src.includes("52: 'walking'")
  );

  assert(
    'HK_WORKOUT_TYPE_MAP maps cycling (13)',
    src.includes("13: 'cycling'")
  );

  assert(
    'HK_WORKOUT_TYPE_MAP maps hiking (24)',
    src.includes("24: 'hiking'")
  );

  // Deduplication via submitted IDs
  assert(
    'HealthKitService tracks submitted workout IDs',
    src.includes('SUBMITTED_IDS_KEY') && src.includes('@healthkit:submitted_workout_ids')
  );

  assert(
    'HealthKitService caps stored IDs at MAX_SUBMITTED_IDS',
    src.includes('MAX_SUBMITTED_IDS')
  );

  // Auto-submit path
  assert(
    'HealthKitService imports SupabaseCompetitionService',
    src.includes('SupabaseCompetitionService')
  );

  assert(
    'HealthKitService imports buildRewardTags',
    src.includes('buildRewardTags')
  );
}

// ---------------------------------------------------------------------------
// Test 3: HealthConnectService exports and patterns
// ---------------------------------------------------------------------------

function testHealthConnectService() {
  console.log('\n=== HealthConnectService patterns ===\n');

  const srcRoot = path.join(__dirname, '../../src');
  const src = fs.readFileSync(
    path.join(srcRoot, 'services/fitness/healthConnectService.ts'),
    'utf8'
  );

  assert(
    'HealthConnectService has getRecentWorkouts method',
    src.includes('async getRecentWorkouts(')
  );

  assert(
    'HealthConnectService uses singleton pattern',
    src.includes('static getInstance()')
  );

  // Source tagging
  assert(
    'Health Connect uses health_connect submitted IDs key',
    src.includes('@healthconnect:submitted_workout_ids')
  );

  // Workout type mapping covers core cardio types
  assert(
    'HC_EXERCISE_TYPE_MAP maps running (56)',
    src.includes("56: 'running'")
  );

  assert(
    'HC_EXERCISE_TYPE_MAP maps walking (79)',
    src.includes("79: 'walking'")
  );

  assert(
    'HC_EXERCISE_TYPE_MAP maps cycling (8)',
    src.includes("8: 'cycling'")
  );

  assert(
    'HC_EXERCISE_TYPE_MAP maps hiking (37)',
    src.includes("37: 'hiking'")
  );

  // Auto-submit path
  assert(
    'HealthConnectService imports SupabaseCompetitionService',
    src.includes('SupabaseCompetitionService')
  );

  assert(
    'HealthConnectService imports buildRewardTags',
    src.includes('buildRewardTags')
  );
}

// ---------------------------------------------------------------------------
// Test 4: LocalWorkout data shape includes correct source values
// ---------------------------------------------------------------------------

function testLocalWorkoutSource() {
  console.log('\n=== LocalWorkout source tagging ===\n');

  const srcRoot = path.join(__dirname, '../../src');
  const src = fs.readFileSync(
    path.join(srcRoot, 'services/fitness/LocalWorkoutStorageService.ts'),
    'utf8'
  );

  assert(
    'LocalWorkout source includes healthkit',
    src.includes("'healthkit'")
  );

  assert(
    'LocalWorkout source includes health_connect',
    src.includes("'health_connect'")
  );

  assert(
    'LocalWorkout source includes gps_tracker',
    src.includes("'gps_tracker'")
  );

  // Verify workout shape has required fields
  assert(
    'LocalWorkout has id field',
    src.includes('id: string;')
  );

  assert(
    'LocalWorkout has type field',
    src.includes('type: WorkoutType;')
  );

  assert(
    'LocalWorkout has distance field',
    src.includes('distance?: number;')
  );

  assert(
    'LocalWorkout has duration field',
    src.includes('duration: number;')
  );

  assert(
    'LocalWorkout has source field',
    src.includes("source: 'gps_tracker'")
  );

  // Auto-backup after workout save
  assert(
    'LocalWorkoutStorageService triggers auto-backup after save',
    src.includes('scheduleBackup')
  );
}

// ---------------------------------------------------------------------------
// Test 5: HealthKitBackgroundService deduplication and CARDIO_TYPES
// ---------------------------------------------------------------------------

function testBackgroundServiceDedup() {
  console.log('\n=== HealthKitBackgroundService dedup & CARDIO_TYPES ===\n');

  const srcRoot = path.join(__dirname, '../../src');
  const src = fs.readFileSync(
    path.join(srcRoot, 'services/fitness/HealthKitBackgroundService.ts'),
    'utf8'
  );

  // Deduplication
  assert(
    'Background service loads submitted IDs for dedup',
    src.includes('getSubmittedIds') && src.includes('submittedIds.has(w.id)')
  );

  assert(
    'Background service saves submitted IDs after sync',
    src.includes('saveSubmittedIds')
  );

  assert(
    'Background service caps stored IDs at MAX_STORED_IDS',
    src.includes('MAX_STORED_IDS') && src.includes('500')
  );

  // CARDIO_TYPES filter
  assert(
    'CARDIO_TYPES includes running',
    src.includes("'running'") && src.includes('CARDIO_TYPES')
  );

  assert(
    'CARDIO_TYPES includes walking',
    src.includes("'walking'")
  );

  assert(
    'CARDIO_TYPES includes cycling',
    src.includes("'cycling'")
  );

  assert(
    'CARDIO_TYPES includes hiking',
    src.includes("'hiking'")
  );

  // Distance/duration validation
  assert(
    'Background service skips workouts with zero distance',
    src.includes('w.distance <= 0') || src.includes('!w.distance')
  );

  assert(
    'Background service skips workouts with zero duration',
    src.includes('w.duration <= 0') || src.includes('!w.duration')
  );

  // Auto-submit path
  assert(
    'Background service calls submitWorkoutSimple',
    src.includes('submitWorkoutSimple')
  );

  // GPS session guard
  assert(
    'Background service checks GPS session guard',
    src.includes('checkGPSSessionGuard')
  );

  // Sync mutex
  assert(
    'Background service has sync mutex',
    src.includes('syncInProgress')
  );
}

// ---------------------------------------------------------------------------
// Test 6: Background task registration (TaskManager.defineTask for Android)
// ---------------------------------------------------------------------------

function testBackgroundTaskRegistration() {
  console.log('\n=== Background task registration ===\n');

  const srcRoot = path.join(__dirname, '../../src');

  // Android: TaskManager.defineTask
  const androidTask = fs.readFileSync(
    path.join(srcRoot, 'services/fitness/AndroidBackgroundSyncTask.ts'),
    'utf8'
  );

  assert(
    'Android task imports TaskManager',
    androidTask.includes("import * as TaskManager from 'expo-task-manager'")
  );

  assert(
    'Android task calls TaskManager.defineTask',
    androidTask.includes('TaskManager.defineTask(ANDROID_SYNC_TASK')
  );

  assert(
    'Android task name is runstr-background-sync',
    androidTask.includes("'runstr-background-sync'")
  );

  // Android: BackgroundSyncRegistration 15-minute interval
  const registration = fs.readFileSync(
    path.join(srcRoot, 'services/fitness/BackgroundSyncRegistration.ts'),
    'utf8'
  );

  assert(
    'Android registration uses 15-minute interval',
    registration.includes('minimumInterval: 15 * 60')
  );

  assert(
    'Android registration uses expo-background-fetch',
    registration.includes("require('expo-background-fetch')")
  );

  assert(
    'Android registration sets stopOnTerminate: false',
    registration.includes('stopOnTerminate: false')
  );

  assert(
    'Android registration sets startOnBoot: true',
    registration.includes('startOnBoot: true')
  );

  // iOS: HealthKitBackgroundTask early registration
  const iosTask = fs.readFileSync(
    path.join(srcRoot, 'services/fitness/HealthKitBackgroundTask.ts'),
    'utf8'
  );

  assert(
    'iOS task registers enableBackgroundDelivery at module level',
    iosTask.includes('enableBackgroundDelivery') && iosTask.includes('HKUpdateFrequency.immediate')
  );

  assert(
    'iOS task routes updates to HealthKitBackgroundService',
    iosTask.includes('HealthKitBackgroundService')
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  console.log('\n=== Background Sync Pipeline Tests ===');

  testRequiredFilesExist();
  testHealthKitService();
  testHealthConnectService();
  testLocalWorkoutSource();
  testBackgroundServiceDedup();
  testBackgroundTaskRegistration();

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
