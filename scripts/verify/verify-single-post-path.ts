/**
 * Verify workout sharing is collapsed to a single posting style.
 * EnhancedSocialShareModal is the one share component used by every flow;
 * its TEMPLATE_OPTIONS picker must expose exactly one card.
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

const src = fs.readFileSync(
  path.join(ROOT, 'src/components/profile/shared/EnhancedSocialShareModal.tsx'),
  'utf-8'
);

// Grab the live (uncommented) TEMPLATE_OPTIONS array assignment.
const m = src.match(/const TEMPLATE_OPTIONS: TemplateOption\[\] = \[([\s\S]*?)\];/);
check('TEMPLATE_OPTIONS array found', !!m);

if (m) {
  // Count entries on lines that are not commented out.
  const liveLines = m[1]
    .split('\n')
    .filter((l) => !l.trim().startsWith('//'));
  const idCount = (liveLines.join('\n').match(/\bid:\s*['"]/g) || []).length;
  console.log(`  Live template options: ${idCount}`);
  check('exactly one template option', idCount === 1, `found ${idCount}`);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
