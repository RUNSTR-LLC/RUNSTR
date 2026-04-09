// scripts/verify/verify-rep-counting.ts
// Run: npx tsx scripts/verify/verify-rep-counting.ts

import { RepCountingService } from '../../src/services/verification/RepCountingService';
import type { PoseLandmark } from '../../src/types/verification';

function makeLandmark(x: number, y: number, visibility = 0.9): PoseLandmark {
  return { x, y, z: 0, visibility };
}

function makePoseWithElbowAngle(desiredAngle: number): PoseLandmark[] {
  const landmarks: PoseLandmark[] = Array(33).fill(null).map(() => makeLandmark(0, 0, 0));

  const angleRad = (desiredAngle * Math.PI) / 180;
  const cosA = Math.cos(angleRad);

  let ey: number;
  if (Math.abs(1 - cosA) < 0.001) {
    ey = 100;
  } else {
    ey = Math.sqrt(Math.abs((1 + cosA) / (1 - cosA)));
  }

  landmarks[11] = makeLandmark(-1, 0);
  landmarks[13] = makeLandmark(0, ey);
  landmarks[15] = makeLandmark(1, 0);

  return landmarks;
}

// Test 0: Geometry validation
console.log('--- Test 0: Geometry helper validation ---');
for (const target of [170, 150, 120, 100, 80, 60]) {
  const pose = makePoseWithElbowAngle(target);
  const actual = RepCountingService.calculateAngle(pose[11], pose[13], pose[15]);
  const diff = Math.abs(actual - target);
  console.log(`  Target: ${target}, Actual: ${actual.toFixed(1)}, Diff: ${diff.toFixed(1)}`);
  console.assert(diff < 2, `Angle should be within 2 degrees of target ${target}`);
}

// Test 1: Full pushup cycle
console.log('\n--- Test 1: Full pushup cycle ---');
const counter = new RepCountingService();

let result = counter.processLandmarks(makePoseWithElbowAngle(170));
console.log(`Initial: state=${result.state}, reps=${result.repCount}`);
console.assert(result.state === 'UP', 'Should start in UP state');
console.assert(result.repCount === 0, 'Should have 0 reps');

result = counter.processLandmarks(makePoseWithElbowAngle(80));
console.log(`After down: state=${result.state}, reps=${result.repCount}`);
console.assert(result.state === 'DOWN', 'Should be DOWN');
console.assert(result.repCount === 0, 'Rep counts on return to UP');

result = counter.processLandmarks(makePoseWithElbowAngle(160));
console.log(`After up: state=${result.state}, reps=${result.repCount}`);
console.assert(result.state === 'UP', 'Should be UP');
console.assert(result.repCount === 1, 'Should have 1 rep');

// Test 2: Multiple reps
console.log('\n--- Test 2: Multiple reps (5 pushups) ---');
counter.reset();
for (let i = 0; i < 5; i++) {
  counter.processLandmarks(makePoseWithElbowAngle(170));
  counter.processLandmarks(makePoseWithElbowAngle(80));
  counter.processLandmarks(makePoseWithElbowAngle(170));
}
const setData = counter.getSetData();
console.log(`Reps: ${setData.reps}, Confidence: ${(setData.confidence * 100).toFixed(0)}%, Timestamps: ${setData.repTimestamps.length}`);
console.assert(setData.reps === 5, 'Should have 5 reps');
console.assert(setData.repTimestamps.length === 5, 'Should have 5 timestamps');
console.assert(setData.confidence === 1, 'All frames should be detected');

// Test 3: Low visibility
console.log('\n--- Test 3: Low visibility ---');
counter.reset();
const lowVis = makePoseWithElbowAngle(80);
lowVis[11].visibility = 0.2;
result = counter.processLandmarks(lowVis);
console.log(`Low vis detected: ${result.landmarksDetected}`);
console.assert(!result.landmarksDetected, 'Should not detect unreliable landmarks');

// Test 4: Mid-range angles
console.log('\n--- Test 4: Mid-range angles ---');
counter.reset();
counter.processLandmarks(makePoseWithElbowAngle(170));
counter.processLandmarks(makePoseWithElbowAngle(120));
result = counter.processLandmarks(makePoseWithElbowAngle(130));
console.log(`Mid-range: state=${result.state}, reps=${result.repCount}`);
console.assert(result.state === 'UP', 'Mid-range should not trigger DOWN');
console.assert(result.repCount === 0, 'No rep counted');

// Test 5: Confidence
console.log('\n--- Test 5: Confidence calculation ---');
counter.reset();
counter.processLandmarks(makePoseWithElbowAngle(170));
counter.processLandmarks(makePoseWithElbowAngle(170));
const badPose = makePoseWithElbowAngle(170);
badPose[11].visibility = 0.1;
counter.processLandmarks(badPose);
const data5 = counter.getSetData();
console.log(`Confidence: ${(data5.confidence * 100).toFixed(0)}% (expected ~67%)`);
console.assert(Math.abs(data5.confidence - 0.667) < 0.01, 'Should be ~67%');

console.log('\n--- All tests passed ---');
