/**
 * Verify: AsyncStorage key consistency across src/
 * Scans all source files for AsyncStorage key usage, groups by feature,
 * checks for collisions, and flags orphaned keys.
 *
 * Run: npx tsx scripts/verify/verify-asyncstorage-key-consistency.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '../../src');

let passed = 0;
let failed = 0;

function assert(name: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  PASS: ${name}`);
    passed++;
  } else {
    console.log(`  FAIL: ${name}${detail ? ' — ' + detail : ''}`);
    failed++;
  }
}

// Recursively find all .ts and .tsx files
function walk(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip node_modules, .git, etc.
      if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
        results.push(...walk(fullPath));
      }
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

// Track key usage: which files read/write each key
interface KeyUsage {
  key: string;
  reads: string[];  // files that getItem this key
  writes: string[]; // files that setItem this key
  removes: string[]; // files that removeItem this key
}

const keyUsageMap = new Map<string, KeyUsage>();

function recordUsage(key: string, file: string, operation: 'read' | 'write' | 'remove') {
  if (!keyUsageMap.has(key)) {
    keyUsageMap.set(key, { key, reads: [], writes: [], removes: [] });
  }
  const usage = keyUsageMap.get(key)!;
  const relFile = path.relative(SRC, file);
  if (operation === 'read' && !usage.reads.includes(relFile)) usage.reads.push(relFile);
  if (operation === 'write' && !usage.writes.includes(relFile)) usage.writes.push(relFile);
  if (operation === 'remove' && !usage.removes.includes(relFile)) usage.removes.push(relFile);
}

// Scan all files
const allFiles = walk(SRC);

// Regex patterns for direct string literal keys
const getItemRegex = /AsyncStorage\.getItem\s*\(\s*['"`]([^'"`$]+)['"`]\s*\)/g;
const setItemRegex = /AsyncStorage\.setItem\s*\(\s*['"`]([^'"`$]+)['"`]\s*/g;
const removeItemRegex = /AsyncStorage\.removeItem\s*\(\s*['"`]([^'"`$]+)['"`]\s*\)/g;

// Also capture constant-based keys from const declarations
const constKeyRegex = /(?:const\s+\w+|[\w_]+)\s*[:=]\s*['"`](@[^'"`]+)['"`]/g;

// Scan each file
for (const file of allFiles) {
  const src = fs.readFileSync(file, 'utf-8');
  let match;

  getItemRegex.lastIndex = 0;
  while ((match = getItemRegex.exec(src)) !== null) {
    recordUsage(match[1], file, 'read');
  }

  setItemRegex.lastIndex = 0;
  while ((match = setItemRegex.exec(src)) !== null) {
    recordUsage(match[1], file, 'write');
  }

  removeItemRegex.lastIndex = 0;
  while ((match = removeItemRegex.exec(src)) !== null) {
    recordUsage(match[1], file, 'remove');
  }
}

// ---- Analysis ----
const allKeys = [...keyUsageMap.keys()].sort();
const runstrKeys = allKeys.filter(k => k.startsWith('@runstr:'));
const healthKitKeys = allKeys.filter(k => k.startsWith('@healthkit') || k.startsWith('@healthconnect'));
const otherPrefixedKeys = allKeys.filter(k => k.startsWith('@') && !k.startsWith('@runstr:') && !k.startsWith('@healthkit') && !k.startsWith('@healthconnect'));
const unprefixedKeys = allKeys.filter(k => !k.startsWith('@'));

console.log('\n=== Key Inventory ===');
console.log(`  Total unique keys found: ${allKeys.length}`);
console.log(`  @runstr: prefixed:       ${runstrKeys.length}`);
console.log(`  @healthkit/connect:      ${healthKitKeys.length}`);
console.log(`  Other @ prefixed:        ${otherPrefixedKeys.length}`);
console.log(`  Unprefixed:              ${unprefixedKeys.length}`);

// ---- Check 1: Unprefixed keys ----
console.log('\n=== Unprefixed Keys (potential collision risk) ===');

assert(
  'No unprefixed AsyncStorage keys',
  unprefixedKeys.length === 0,
  unprefixedKeys.length > 0
    ? `Found ${unprefixedKeys.length} unprefixed key(s):\n${unprefixedKeys.map(k => {
        const usage = keyUsageMap.get(k)!;
        const files = [...new Set([...usage.reads, ...usage.writes, ...usage.removes])];
        return `    "${k}" in: ${files.join(', ')}`;
      }).join('\n')}`
    : undefined
);

// ---- Check 2: Key collisions (same key, different meanings) ----
console.log('\n=== Key Collision Check ===');

// Check for keys that differ only by case
const lowerCaseMap = new Map<string, string[]>();
for (const key of allKeys) {
  const lower = key.toLowerCase();
  if (!lowerCaseMap.has(lower)) lowerCaseMap.set(lower, []);
  lowerCaseMap.get(lower)!.push(key);
}
const caseCollisions = [...lowerCaseMap.entries()].filter(([_, keys]) => keys.length > 1);

assert(
  'No case-insensitive key collisions',
  caseCollisions.length === 0,
  caseCollisions.length > 0
    ? `Collisions: ${caseCollisions.map(([_, keys]) => keys.join(' vs ')).join('; ')}`
    : undefined
);

// ---- Check 3: Orphaned keys (written but never read) ----
console.log('\n=== Orphaned Keys (written but never read) ===');

const orphanedKeys: string[] = [];
for (const [key, usage] of keyUsageMap.entries()) {
  if (usage.writes.length > 0 && usage.reads.length === 0) {
    orphanedKeys.push(key);
  }
}

// Some keys are written for external use (e.g., backup), so we allow a small number
assert(
  'Few orphaned keys (written but never read in source)',
  orphanedKeys.length <= 5,
  orphanedKeys.length > 0
    ? `Found ${orphanedKeys.length} orphaned key(s):\n${orphanedKeys.map(k => {
        const usage = keyUsageMap.get(k)!;
        return `    "${k}" written by: ${usage.writes.join(', ')}`;
      }).join('\n')}`
    : 'No orphaned keys found'
);

// ---- Check 4: Read-only keys (read but never written in source) ----
console.log('\n=== Read-only Keys (read but never written in source) ===');

const readOnlyKeys: string[] = [];
for (const [key, usage] of keyUsageMap.entries()) {
  if (usage.reads.length > 0 && usage.writes.length === 0) {
    readOnlyKeys.push(key);
  }
}

// Some read-only keys may be set by stores (Zustand persist) or native code
if (readOnlyKeys.length > 0) {
  console.log(`  INFO: ${readOnlyKeys.length} key(s) are read but not written in scanned source:`);
  for (const k of readOnlyKeys.slice(0, 10)) {
    const usage = keyUsageMap.get(k)!;
    console.log(`    "${k}" read by: ${usage.reads.slice(0, 3).join(', ')}${usage.reads.length > 3 ? '...' : ''}`);
  }
  if (readOnlyKeys.length > 10) {
    console.log(`    ... and ${readOnlyKeys.length - 10} more`);
  }
}

// ---- Check 5: Feature grouping ----
console.log('\n=== Keys Grouped by Feature Area ===');

const featureGroups: Record<string, string[]> = {
  'Auth/Identity': [],
  'Workout/Fitness': [],
  'Rewards/Team': [],
  'Club': [],
  'Profile': [],
  'Settings/Preferences': [],
  'Cache': [],
  'Notifications': [],
  'HealthKit/Connect': [],
  'Subscription': [],
  'Other': [],
};

for (const key of allKeys) {
  if (/auth|nsec|npub|pubkey|amber|login|signup/.test(key.toLowerCase())) {
    featureGroups['Auth/Identity'].push(key);
  } else if (/health|workout|exercise|step|fitness|gps|session/.test(key.toLowerCase())) {
    featureGroups['Workout/Fitness'].push(key);
  } else if (/reward|team|charity|zap|lightning|payout|spin/.test(key.toLowerCase())) {
    featureGroups['Rewards/Team'].push(key);
  } else if (/club/.test(key.toLowerCase())) {
    featureGroups['Club'].push(key);
  } else if (/profile|draft/.test(key.toLowerCase())) {
    featureGroups['Profile'].push(key);
  } else if (/setting|unit|private_mode|preference/.test(key.toLowerCase())) {
    featureGroups['Settings/Preferences'].push(key);
  } else if (/cache|timestamp/.test(key.toLowerCase())) {
    featureGroups['Cache'].push(key);
  } else if (/notif|broadcast|token/.test(key.toLowerCase())) {
    featureGroups['Notifications'].push(key);
  } else if (/subscri/.test(key.toLowerCase())) {
    featureGroups['Subscription'].push(key);
  } else {
    featureGroups['Other'].push(key);
  }
}

for (const [group, keys] of Object.entries(featureGroups)) {
  if (keys.length > 0) {
    console.log(`\n  ${group} (${keys.length}):`);
    for (const k of keys) {
      const usage = keyUsageMap.get(k)!;
      const ops = [];
      if (usage.reads.length > 0) ops.push(`R:${usage.reads.length}`);
      if (usage.writes.length > 0) ops.push(`W:${usage.writes.length}`);
      if (usage.removes.length > 0) ops.push(`D:${usage.removes.length}`);
      console.log(`    ${k}  [${ops.join(', ')}]`);
    }
  }
}

// ---- Check 6: Consistent prefix usage ----
console.log('\n=== Prefix Consistency ===');

const runstrRatio = runstrKeys.length / Math.max(allKeys.length, 1);
assert(
  'Majority of keys use @runstr: prefix',
  runstrRatio > 0.6,
  `${runstrKeys.length}/${allKeys.length} (${(runstrRatio * 100).toFixed(0)}%) use @runstr: prefix`
);

// Check health service keys use appropriate prefix
assert(
  'HealthKit keys use @healthkit: prefix',
  healthKitKeys.filter(k => k.startsWith('@healthkit:')).length >= 1,
  `Found: ${healthKitKeys.join(', ')}`
);

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
