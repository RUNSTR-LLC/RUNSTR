/**
 * Verify: Health Connect runs mislabeled as walks get corrected to running,
 * while genuine walks stay walks.
 * Run: npx tsx scripts/verify/verify-walk-mislabel-correction.ts
 */
import { correctWalkingMislabel } from '../../src/utils/activityInference';

type Case = {
  name: string;
  labeled: 'walking' | 'running' | 'cycling' | 'hiking';
  distanceMeters?: number;
  durationSeconds?: number;
  expected: string;
};

// speed = distance/duration * 3.6 km/h; override threshold is 8.0 km/h
const cases: Case[] = [
  // 5 km in 30 min = 10 km/h -> clearly a run mislabeled as walk
  { name: 'Run mislabeled walk (10 km/h)', labeled: 'walking', distanceMeters: 5000, durationSeconds: 1800, expected: 'running' },
  // 5 km in 25 min = 12 km/h -> run
  { name: 'Fast run mislabeled walk (12 km/h)', labeled: 'walking', distanceMeters: 5000, durationSeconds: 1500, expected: 'running' },
  // 3 km in 30 min = 6 km/h -> genuine brisk walk, stays walk
  { name: 'Genuine brisk walk (6 km/h)', labeled: 'walking', distanceMeters: 3000, durationSeconds: 1800, expected: 'walking' },
  // exactly at threshold: 8 km/h -> 4 km in 30 min -> running
  { name: 'Exactly 8 km/h', labeled: 'walking', distanceMeters: 4000, durationSeconds: 1800, expected: 'running' },
  // race-walk-ish 7.5 km/h stays walk (conservative)
  { name: 'Fast walk 7.5 km/h stays walk', labeled: 'walking', distanceMeters: 3750, durationSeconds: 1800, expected: 'walking' },
  // never touch a real running label
  { name: 'Running label untouched', labeled: 'running', distanceMeters: 5000, durationSeconds: 1800, expected: 'running' },
  // never promote a cycle
  { name: 'Cycling label untouched', labeled: 'cycling', distanceMeters: 20000, durationSeconds: 1800, expected: 'cycling' },
  // missing distance -> can't judge, keep label
  { name: 'Walk with no distance', labeled: 'walking', distanceMeters: 0, durationSeconds: 1800, expected: 'walking' },
  // zero duration -> keep label (no divide-by-zero)
  { name: 'Walk with zero duration', labeled: 'walking', distanceMeters: 5000, durationSeconds: 0, expected: 'walking' },
];

let pass = 0;
let fail = 0;
for (const c of cases) {
  const got = correctWalkingMislabel(c.labeled, c.distanceMeters, c.durationSeconds);
  const ok = got === c.expected;
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${c.name}: got '${got}', expected '${c.expected}'`);
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
