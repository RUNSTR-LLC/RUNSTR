/**
 * Verify lottery wheel implementation compiles and types are correct
 */
import { calculateLotteryMultiplier, DEFAULT_SEGMENTS } from '../../src/types/lottery';

// Verify multiplier formula
const testCases = [
  { level: 1, expected: 1.35 },
  { level: 10, expected: 2.20 },
  { level: 100, expected: 3.31 },
];

let passed = 0;
for (const { level, expected } of testCases) {
  const result = parseFloat(calculateLotteryMultiplier(level).toFixed(2));
  const match = Math.abs(result - expected) < 0.02;
  console.log(`Level ${level}: ${result}x (expected ~${expected}x) ${match ? 'PASS' : 'FAIL'}`);
  if (match) passed++;
}

// Verify segments sum to ~1.0
const probSum = DEFAULT_SEGMENTS.reduce((sum, s) => sum + s.probability, 0);
const probMatch = Math.abs(probSum - 1.0) < 0.001;
console.log(`\nProbability sum: ${probSum} (expected 1.0) ${probMatch ? 'PASS' : 'FAIL'}`);
if (probMatch) passed++;

// Verify expected value
const ev = DEFAULT_SEGMENTS.reduce((sum, s) => sum + s.baseValue * s.probability, 0);
const evMatch = Math.abs(ev - 37.0) < 0.1;
console.log(`Expected value: ${ev} (expected 37.0) ${evMatch ? 'PASS' : 'FAIL'}`);
if (evMatch) passed++;

console.log(`\n${passed}/${testCases.length + 2} checks passed`);
process.exit(passed === testCases.length + 2 ? 0 : 1);
