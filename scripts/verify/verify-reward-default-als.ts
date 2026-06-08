/**
 * Regression guard: the simplification pass must NOT have altered reward routing.
 * Rewards still default to ALS Network (Running Bitcoin Primal address) when the
 * user has no lightning address. (The Me/ALS toggle was deliberately skipped.)
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

const charities = fs.readFileSync(path.join(ROOT, 'src/constants/charities.ts'), 'utf-8');
const dest = fs.readFileSync(path.join(ROOT, 'src/services/rewards/RewardDestinationService.ts'), 'utf-8');

check("ALS charity id 'als-foundation' present", /id:\s*['"]als-foundation['"]/.test(charities));
check('ALS lightning address present', /RunningBTC@primal\.net/.test(charities));
check("default reward destination is 'als-foundation'", /DEFAULT_CHARITY_ID\s*=\s*['"]als-foundation['"]/.test(dest));
check('self team id still defined', /SELF_TEAM_ID\s*=\s*['"]self['"]/.test(charities));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
