/**
 * Verify that register-season2-participants.cjs npubs match season2.ts source of truth
 */
import { SEASON_2_PARTICIPANTS } from '../../src/constants/season2';
import * as fs from 'fs';

// Extract npubs from the registration script
const scriptContent = fs.readFileSync('scripts/register-season2-participants.cjs', 'utf-8');
const npubRegex = /'(npub1[a-z0-9]+)'/g;
const scriptNpubs: string[] = [];
let match;
while ((match = npubRegex.exec(scriptContent)) !== null) {
  scriptNpubs.push(match[1]);
}

// Get source of truth npubs
const sourceNpubs = SEASON_2_PARTICIPANTS.map(p => p.npub);

console.log(`Source of truth (season2.ts): ${sourceNpubs.length} participants`);
console.log(`Registration script: ${scriptNpubs.length} participants`);
console.log();

// Check for mismatches
let mismatches = 0;

for (let i = 0; i < sourceNpubs.length; i++) {
  const source = sourceNpubs[i];
  const script = scriptNpubs[i];
  const name = SEASON_2_PARTICIPANTS[i].name;

  if (source !== script) {
    mismatches++;
    console.log(`MISMATCH [${name}]:`);
    console.log(`  Source: ${source}`);
    console.log(`  Script: ${script || '(missing)'}`);
  }
}

// Check for npubs in source but not in script
const missingFromScript = sourceNpubs.filter(n => !scriptNpubs.includes(n));
const extraInScript = scriptNpubs.filter(n => !sourceNpubs.includes(n));

if (missingFromScript.length > 0) {
  console.log(`\nMissing from script: ${missingFromScript.length}`);
  missingFromScript.forEach(n => {
    const p = SEASON_2_PARTICIPANTS.find(p => p.npub === n);
    console.log(`  - ${p?.name}: ${n}`);
  });
}

if (extraInScript.length > 0) {
  console.log(`\nExtra in script (not in source): ${extraInScript.length}`);
  extraInScript.forEach(n => console.log(`  - ${n}`));
}

if (mismatches === 0 && missingFromScript.length === 0 && extraInScript.length === 0) {
  console.log('ALL NPUBS MATCH! Script is in sync with source of truth.');
} else {
  console.log(`\nFAILED: ${mismatches} mismatches, ${missingFromScript.length} missing, ${extraInScript.length} extra`);
  process.exit(1);
}
