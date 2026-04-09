/**
 * Audit: Charity Config Consistency
 * Cross-checks charity IDs across charities.ts, charityPayments.ts,
 * and i18n locale files (en, de) for mismatches and orphans.
 */

import * as fs from 'fs';
import * as path from 'path';

const root = path.resolve(__dirname, '../..');

// Parse charity IDs from charities.ts
function parseCharityIds(): string[] {
  const file = path.join(root, 'src/constants/charities.ts');
  const content = fs.readFileSync(file, 'utf-8');
  const ids: string[] = [];
  const regex = /id:\s*['"]([^'"]+)['"]/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    ids.push(match[1]);
  }
  return ids;
}

// Parse charity IDs referenced in charityPayments.ts
function parsePaymentIds(): string[] {
  const file = path.join(root, 'src/config/charityPayments.ts');
  const content = fs.readFileSync(file, 'utf-8');
  const ids: string[] = [];

  // Look for string IDs in arrays and object keys
  const regex = /['"]([a-z][\w-]+)['"]/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const id = match[1];
    // Filter out non-charity strings by heuristic
    if (id.includes('-') && !id.includes('@') && !id.startsWith('http')) {
      ids.push(id);
    }
  }
  return [...new Set(ids)];
}

// Parse locale JSON description keys
function parseLocaleKeys(locale: string): string[] {
  const file = path.join(root, `src/i18n/locales/${locale}/charities.json`);
  if (!fs.existsSync(file)) {
    console.log(`WARN: Missing locale file: ${locale}/charities.json`);
    return [];
  }
  const content = JSON.parse(fs.readFileSync(file, 'utf-8'));
  return Object.keys(content.descriptions || {});
}

console.log('=== Charity Config Consistency Audit ===\n');

const charityIds = parseCharityIds();
const paymentIds = parsePaymentIds();
const enKeys = parseLocaleKeys('en');
const deKeys = parseLocaleKeys('de');

let issues = 0;

console.log(`Charity IDs (charities.ts): ${charityIds.length}`);
console.log(`Payment IDs (charityPayments.ts): ${paymentIds.length}`);
console.log(`EN locale keys: ${enKeys.length}`);
console.log(`DE locale keys: ${deKeys.length}\n`);

// Check: Every charity should have EN translation
for (const id of charityIds) {
  if (!enKeys.includes(id)) {
    console.log(`FLAG: "${id}" in charities.ts but missing EN translation`);
    issues++;
  }
}

// Check: Every charity should have DE translation
for (const id of charityIds) {
  if (!deKeys.includes(id)) {
    console.log(`FLAG: "${id}" in charities.ts but missing DE translation`);
    issues++;
  }
}

// Check: Orphaned EN keys (in locale but not in charities.ts)
for (const key of enKeys) {
  if (!charityIds.includes(key)) {
    console.log(`FLAG: "${key}" in EN locale but not in charities.ts (orphan)`);
    issues++;
  }
}

// Check: Orphaned DE keys
for (const key of deKeys) {
  if (!charityIds.includes(key)) {
    console.log(`FLAG: "${key}" in DE locale but not in charities.ts (orphan)`);
    issues++;
  }
}

// Check: EN and DE should have same keys
for (const key of enKeys) {
  if (!deKeys.includes(key)) {
    console.log(`FLAG: "${key}" in EN but missing in DE`);
    issues++;
  }
}
for (const key of deKeys) {
  if (!enKeys.includes(key)) {
    console.log(`FLAG: "${key}" in DE but missing in EN`);
    issues++;
  }
}

// Check: Payment IDs should exist in charities.ts
for (const id of paymentIds) {
  if (!charityIds.includes(id)) {
    console.log(`FLAG: "${id}" in charityPayments.ts but not in charities.ts`);
    issues++;
  }
}

console.log(`\n--- Summary ---`);
console.log(`Total issues: ${issues}`);
console.log(`Charities: ${charityIds.length} | EN: ${enKeys.length} | DE: ${deKeys.length} | Payments: ${paymentIds.length}`);

process.exit(0);
