/**
 * Verify the simplification feature flags are hiding the right surfaces.
 * teams / customEvents / seasons must be false (2026-06-08 hide-not-delete pass).
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');
let passed = 0;
let failed = 0;

function check(name: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  PASS: ${name}`);
    passed++;
  } else {
    console.log(`  FAIL: ${name}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

const src = fs.readFileSync(path.join(ROOT, 'src/config/features.ts'), 'utf-8');

for (const flag of ['teams', 'customEvents', 'seasons']) {
  const re = new RegExp(`${flag}\\s*:\\s*false`);
  check(`${flag} is hidden (false)`, re.test(src), `expected "${flag}: false" in features.ts`);
}

// Existing flags must still be present (we extended, not replaced)
check('NWC wallet flag preserved', /ENABLE_NWC_WALLET\s*:\s*true/.test(src));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
