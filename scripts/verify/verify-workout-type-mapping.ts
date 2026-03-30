/**
 * Verify: Workout type consistency across codebase
 * Checks that CARDIO_TYPES arrays match, getExerciseVerb returns valid types,
 * and all types comply with KIND_1301_SPEC (lowercase full words).
 *
 * Run: npx tsx scripts/verify/verify-workout-type-mapping.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '../../src');

let passed = 0;
let failed = 0;

function assert(name: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  PASS: ${name}`);
    passed++;
  } else {
    console.log(`  FAIL: ${name}${detail ? ' — ' + detail : ''}`);
    failed++;
  }
}

function readFile(relativePath: string): string {
  return fs.readFileSync(path.join(SRC, relativePath), 'utf-8');
}

// KIND 1301 SPEC valid exercise types (from docs/KIND_1301_SPEC.md)
const SPEC_CARDIO = ['running', 'walking', 'cycling', 'hiking', 'swimming', 'rowing'];
const SPEC_STRENGTH = ['strength'];
const SPEC_WELLNESS = ['yoga', 'meditation'];
const SPEC_ALL = [...SPEC_CARDIO, ...SPEC_STRENGTH, ...SPEC_WELLNESS, 'diet', 'fasting'];

// ---- CARDIO_TYPES consistency ----
console.log('\n=== CARDIO_TYPES Array Consistency ===');

interface CardioLocation {
  file: string;
  types: string[];
  line: string;
}

const filesToCheck = [
  'services/fitness/LocalWorkoutStorageService.ts',
  'services/fitness/HealthKitBackgroundService.ts',
  'services/fitness/healthKitService.ts',
  'services/fitness/healthConnectService.ts',
];

const cardioLocations: CardioLocation[] = [];

for (const file of filesToCheck) {
  try {
    const src = readFile(file);
    const regex = /CARDIO_TYPES\s*[:=]\s*\[([^\]]+)\]/g;
    let match;
    while ((match = regex.exec(src)) !== null) {
      const types = match[1]
        .replace(/['"]/g, '')
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0)
        .sort();
      cardioLocations.push({ file, types, line: match[0].trim() });
    }
  } catch {
    // File may not exist (e.g., healthConnectService on iOS-only dev)
  }
}

assert(
  'Found CARDIO_TYPES in multiple files',
  cardioLocations.length >= 3,
  `Found in ${cardioLocations.length} location(s)`
);

// Check all are identical
const canonical = cardioLocations[0]?.types.join(',') || '';
const allMatch = cardioLocations.every(loc => loc.types.join(',') === canonical);
assert(
  'All CARDIO_TYPES arrays contain the same types',
  allMatch,
  allMatch
    ? `All contain: [${canonical}]`
    : cardioLocations.map(loc => `  ${loc.file}: [${loc.types.join(', ')}]`).join('\n')
);

// Check that CARDIO_TYPES are a subset of SPEC_CARDIO
if (cardioLocations.length > 0) {
  const cardioTypes = cardioLocations[0].types;
  const allInSpec = cardioTypes.every(t => SPEC_CARDIO.includes(t));
  assert(
    'CARDIO_TYPES are all valid KIND_1301_SPEC cardio types',
    allInSpec,
    allInSpec
      ? `Types: [${cardioTypes.join(', ')}]`
      : `Non-spec types: ${cardioTypes.filter(t => !SPEC_CARDIO.includes(t)).join(', ')}`
  );

  const allLowercase = cardioTypes.every(t => t === t.toLowerCase());
  assert(
    'CARDIO_TYPES are all lowercase',
    allLowercase,
    allLowercase ? undefined : `Uppercase found: ${cardioTypes.filter(t => t !== t.toLowerCase()).join(', ')}`
  );
}

// ---- getExerciseVerb mapping ----
console.log('\n=== getExerciseVerb Mapping ===');

const publishingSrc = readFile('services/nostr/workoutPublishingService.ts');

// Extract the getExerciseVerb method body
const verbStart = publishingSrc.indexOf('private getExerciseVerb(');
const verbEnd = publishingSrc.indexOf('\n  }', verbStart + 10);
const verbBody = publishingSrc.slice(verbStart, verbEnd + 4);

// Extract all return values
const returnMatches = verbBody.match(/return\s+'([^']+)'/g) || [];
const returnValues = returnMatches.map(m => m.replace(/return\s+'/, '').replace(/'/, ''));
const uniqueReturnValues = [...new Set(returnValues)];

assert(
  'getExerciseVerb is defined',
  verbBody.length > 50,
  'Should be a substantial function'
);

assert(
  'getExerciseVerb returns lowercase values only',
  uniqueReturnValues.every(v => v === v.toLowerCase()),
  uniqueReturnValues.every(v => v === v.toLowerCase())
    ? `Returns: [${uniqueReturnValues.join(', ')}]`
    : `Uppercase found: ${uniqueReturnValues.filter(v => v !== v.toLowerCase()).join(', ')}`
);

// Check all return values are valid KIND_1301_SPEC types
const invalidReturns = uniqueReturnValues.filter(v => !SPEC_ALL.includes(v));
assert(
  'getExerciseVerb returns only KIND_1301_SPEC valid types',
  invalidReturns.length === 0,
  invalidReturns.length > 0
    ? `Non-spec returns: [${invalidReturns.join(', ')}]`
    : `All ${uniqueReturnValues.length} return values are spec-compliant`
);

// Check no abbreviated types (run, walk, hike, bike, etc.)
const abbreviatedPatterns = ['run', 'walk', 'hike', 'bike', 'swim'];
const hasAbbreviated = uniqueReturnValues.some(v =>
  abbreviatedPatterns.includes(v)
);
assert(
  'getExerciseVerb does not return abbreviated types',
  !hasAbbreviated,
  hasAbbreviated
    ? `Abbreviated types found: ${uniqueReturnValues.filter(v => abbreviatedPatterns.includes(v)).join(', ')}`
    : 'All types are full words'
);

// Check default fallback
assert(
  'getExerciseVerb has a default fallback',
  verbBody.includes("return 'running'") || verbBody.includes('return "running"'),
  'Should default to running for unrecognized types'
);

// ---- HealthKit type mapping ----
console.log('\n=== HealthKit Type Mapping ===');

const hkServiceSrc = readFile('services/fitness/healthKitService.ts');

// Extract HK_WORKOUT_TYPE_MAP entries
const hkMapStart = hkServiceSrc.indexOf('HK_WORKOUT_TYPE_MAP');
const hkMapEnd = hkServiceSrc.indexOf('};', hkMapStart);
const hkMapBlock = hkServiceSrc.slice(hkMapStart, hkMapEnd + 2);

// Extract all mapped types (only from value positions, not comments)
// Lines in HK_WORKOUT_TYPE_MAP look like: 37: 'running', // comment
// We want only the values after the colon, not text in comments
const hkLines = hkMapBlock.split('\n');
const hkMappedTypes: string[] = [];
for (const line of hkLines) {
  // Remove comments first
  const noComment = line.replace(/\/\/.*$/, '');
  const valueMatch = noComment.match(/:\s*'([a-z_]+)'/);
  if (valueMatch) {
    if (!hkMappedTypes.includes(valueMatch[1])) {
      hkMappedTypes.push(valueMatch[1]);
    }
  }
}

assert(
  'HK_WORKOUT_TYPE_MAP maps to lowercase types only',
  hkMappedTypes.every(t => t === t.toLowerCase()),
  `Mapped types: [${hkMappedTypes.join(', ')}]`
);

// Check core cardio types are mapped
const coreCardio = ['running', 'walking', 'cycling', 'hiking'];
const allCoreMapped = coreCardio.every(t => hkMappedTypes.includes(t));
assert(
  'HK_WORKOUT_TYPE_MAP includes all core cardio types',
  allCoreMapped,
  allCoreMapped
    ? undefined
    : `Missing: ${coreCardio.filter(t => !hkMappedTypes.includes(t)).join(', ')}`
);

// Check no "other" type
assert(
  'HK_WORKOUT_TYPE_MAP never maps to "other"',
  !hkMappedTypes.includes('other'),
  'Per spec: unrecognized types should map to running, never other'
);

// ---- Exercise tag values in LocalWorkoutStorageService ----
console.log('\n=== Exercise Tag Format ===');

const localSrc = readFile('services/fitness/LocalWorkoutStorageService.ts');

// Check buildWorkoutTags uses workout.type directly
assert(
  'buildWorkoutTags uses workout.type as exercise tag value',
  localSrc.includes("['exercise', workout.type]"),
  'Exercise tag should be the workout type string directly'
);

// ---- WorkoutType enum check ----
console.log('\n=== WorkoutType Definition ===');

let workoutTypeSrc = '';
try {
  workoutTypeSrc = readFile('types/workout.ts');
} catch {
  // Try alternative path
  try {
    workoutTypeSrc = readFile('types/workout.d.ts');
  } catch {
    // Skip this section if file not found
  }
}

if (workoutTypeSrc) {
  // Check WorkoutType includes all required types
  const hasRunning = workoutTypeSrc.includes("'running'") || workoutTypeSrc.includes('"running"');
  const hasWalking = workoutTypeSrc.includes("'walking'") || workoutTypeSrc.includes('"walking"');
  const hasCycling = workoutTypeSrc.includes("'cycling'") || workoutTypeSrc.includes('"cycling"');
  const hasHiking = workoutTypeSrc.includes("'hiking'") || workoutTypeSrc.includes('"hiking"');

  assert(
    'WorkoutType includes all core cardio types',
    hasRunning && hasWalking && hasCycling && hasHiking,
    [
      !hasRunning ? 'missing running' : '',
      !hasWalking ? 'missing walking' : '',
      !hasCycling ? 'missing cycling' : '',
      !hasHiking ? 'missing hiking' : '',
    ].filter(Boolean).join(', ') || 'All present'
  );
} else {
  console.log('  SKIP: Could not find types/workout.ts');
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
