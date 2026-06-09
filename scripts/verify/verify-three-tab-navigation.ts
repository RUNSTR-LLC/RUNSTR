/**
 * Verify the bottom tab navigator is exactly the three simplified surfaces:
 * Home (shown as "Dashboard"), Social, and Leaderboard. Nothing more.
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

const nav = fs.readFileSync(path.join(ROOT, 'src/navigation/BottomTabNavigator.tsx'), 'utf-8');
const tabNames = [...nav.matchAll(/<Tab\.Screen\s+name=["'](\w+)["']/g)].map((m) => m[1]);

console.log('  Tabs found:', tabNames.join(', '));

const expected = ['Home', 'Social', 'Leaderboard'];
check('exactly 3 tabs', tabNames.length === 3, `found ${tabNames.length}`);
for (const t of expected) {
  check(`tab "${t}" present`, tabNames.includes(t));
}
check('no "History" tab', !tabNames.includes('History'));
// Home tab title should read "Dashboard" (i18next defaultValue form or literal)
check(
  'Home tab titled Dashboard',
  /tabDashboard['"]\s*,\s*['"]Dashboard['"]|tabDashboard['"]\)\s*\?\?\s*['"]Dashboard['"]|title:\s*['"]Dashboard['"]/.test(nav)
);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
