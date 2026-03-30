/**
 * Verify lottery wheel implementation compiles and types are correct
 * Formula: linear 1.0 + level * 0.1
 */
import { calculateLotteryMultiplier, DEFAULT_SEGMENTS } from '../../src/types/lottery';

// Verify multiplier formula (linear: 1.0 + level * 0.1)
const testCases = [
  { level: 0, expected: 1.0 },
  { level: 1, expected: 1.1 },
  { level: 10, expected: 2.0 },
  { level: 50, expected: 6.0 },
];

let passed = 0;
let total = 0;
for (const { level, expected } of testCases) {
  total++;
  const result = parseFloat(calculateLotteryMultiplier(level).toFixed(2));
  const match = Math.abs(result - expected) < 0.02;
  console.log(`Level ${level}: ${result}x (expected ${expected}x) ${match ? 'PASS' : 'FAIL'}`);
  if (match) passed++;
}

// Verify segments sum to ~1.0
total++;
const probSum = DEFAULT_SEGMENTS.reduce((sum, s) => sum + s.probability, 0);
const probMatch = Math.abs(probSum - 1.0) < 0.001;
console.log(`\nProbability sum: ${probSum} (expected 1.0) ${probMatch ? 'PASS' : 'FAIL'}`);
if (probMatch) passed++;

// Verify expected value matches actual segments
total++;
const ev = DEFAULT_SEGMENTS.reduce((sum, s) => sum + s.baseValue * s.probability, 0);
const evExpected = 70.75;
const evMatch = Math.abs(ev - evExpected) < 0.1;
console.log(`Expected value: ${ev} (expected ${evExpected}) ${evMatch ? 'PASS' : 'FAIL'}`);
if (evMatch) passed++;

// Verify all segments have valid values
total++;
const allValid = DEFAULT_SEGMENTS.every(s => s.baseValue > 0 && s.probability > 0 && s.probability <= 1);
console.log(`All segments valid: ${allValid ? 'PASS' : 'FAIL'}`);
if (allValid) passed++;

// Verify segments are ordered by value ascending
total++;
const ordered = DEFAULT_SEGMENTS.every((s, i) => i === 0 || s.baseValue >= DEFAULT_SEGMENTS[i - 1].baseValue);
console.log(`Segments ordered by value: ${ordered ? 'PASS' : 'FAIL'}`);
if (ordered) passed++;

console.log(`\n${passed}/${total} checks passed`);
process.exit(passed === total ? 0 : 1);
