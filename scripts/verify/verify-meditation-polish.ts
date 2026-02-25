/**
 * Verify meditation polish features are properly wired up
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');

// 1. BreathingCircle component exists
const breathingCirclePath = path.join(ROOT, 'src/components/activity/BreathingCircle.tsx');
const breathingCircleExists = fs.existsSync(breathingCirclePath);
console.log(`${breathingCircleExists ? '✓' : '✗'} BreathingCircle exists: ${breathingCircleExists}`);

// 2. BreathingCircle has correct animation pattern
const breathingSrc = fs.readFileSync(breathingCirclePath, 'utf-8');
const breathingChecks = [
  ['cancelAnimation', 'Uses cancelAnimation for proper pause'],
  ['runOnJS', 'Uses runOnJS for synced label updates'],
  ['INHALE_MS = 4000', '4s inhale duration'],
  ['HOLD_MS = 4000', '4s hold duration'],
  ['EXHALE_MS = 6000', '6s exhale duration'],
  ['isPaused', 'Accepts isPaused prop'],
];

let allPassed = breathingCircleExists;
for (const [search, label] of breathingChecks) {
  const found = breathingSrc.includes(search);
  console.log(`${found ? '✓' : '✗'} ${label}`);
  if (!found) allPassed = false;
}

// 3. MeditationTrackerScreen has all features
const meditationPath = path.join(ROOT, 'src/screens/activity/MeditationTrackerScreen.tsx');
const meditationSrc = fs.readFileSync(meditationPath, 'utf-8');

console.log('\n--- MeditationTrackerScreen ---');
const meditationChecks = [
  ['DURATION_PRESETS', 'Duration presets constant'],
  ['targetDuration', 'Target duration state'],
  ['BreathingCircle', 'BreathingCircle import/usage'],
  ['expo-haptics', 'Haptics import'],
  ['MILESTONE_SECONDS', 'Milestone constants'],
  ['firedMilestonesRef', 'Milestone tracking ref'],
  ['autoStopFiredRef', 'Auto-stop ref'],
  ['Haptics.notificationAsync', 'Auto-stop haptic'],
  ['Haptics.impactAsync', 'Milestone haptic'],
  ['breathworkTimer', 'Breathwork timer style'],
  ['isPausedRef.current', 'Uses ref in interval (no stale closure)'],
  ['cancelAnimation', 'Not present (should not be here)'].length === 0 ? ['x', 'skip'] : ['isBreathwork', 'Conditional breathwork layout'],
];

for (const [search, label] of meditationChecks) {
  const found = meditationSrc.includes(search);
  console.log(`${found ? '✓' : '✗'} ${label}`);
  if (!found) allPassed = false;
}

// 4. Line count
const lineCount = meditationSrc.split('\n').length;
console.log(`\nMeditationTrackerScreen: ${lineCount} lines`);

console.log(`\n${allPassed ? 'ALL CHECKS PASSED' : 'SOME CHECKS FAILED'}`);
process.exit(allPassed ? 0 : 1);
