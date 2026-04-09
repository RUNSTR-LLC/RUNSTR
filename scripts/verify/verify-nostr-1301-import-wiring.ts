/**
 * Verify that Nostr 1301 import is properly wired into UnifiedWorkoutsTab
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');

function check(label: string, condition: boolean) {
  console.log(condition ? `  PASS: ${label}` : `  FAIL: ${label}`);
  return condition;
}

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean) {
  if (check(label, condition)) passed++;
  else failed++;
}

// 1. UnifiedWorkoutsTab imports Nostr1301ImportService
const unifiedTab = fs.readFileSync(
  path.join(ROOT, 'src/components/profile/tabs/UnifiedWorkoutsTab.tsx'),
  'utf-8'
);

assert(
  'UnifiedWorkoutsTab imports Nostr1301ImportService',
  unifiedTab.includes("import { Nostr1301ImportService }") ||
    unifiedTab.includes("from '../../../services/fitness/Nostr1301ImportService'")
);

assert(
  'UnifiedWorkoutsTab calls importNostrWorkoutHistory on mount',
  unifiedTab.includes('importNostrWorkoutHistory')
);

assert(
  'importNostrWorkoutHistory calls importUserHistory',
  unifiedTab.includes('importUserHistory')
);

assert(
  'Import reloads local workouts after importing',
  unifiedTab.includes('result.totalImported > 0') &&
    unifiedTab.includes('setLocalWorkouts')
);

// 2. Nostr1301ImportService queues for Supabase
const importService = fs.readFileSync(
  path.join(ROOT, 'src/services/fitness/Nostr1301ImportService.ts'),
  'utf-8'
);

assert(
  'Nostr1301ImportService queues imported workouts for Supabase',
  importService.includes('queueImportedForSupabase')
);

assert(
  'Nostr1301ImportService saves to LocalWorkoutStorageService',
  importService.includes('saveImportedNostrWorkout')
);

// 3. Session throttle prevents excessive re-imports
assert(
  'Session-based throttle prevents repeated imports',
  unifiedTab.includes('nostr_import_session')
);

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
