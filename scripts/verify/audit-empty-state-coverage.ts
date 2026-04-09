/**
 * Audit: Empty State Coverage
 * Scans screen and component files that render FlatList or map over arrays.
 * Flags lists that have no empty state handler (ListEmptyComponent, length check, etc).
 */

import * as fs from 'fs';
import * as path from 'path';

const SCAN_DIRS = [
  path.resolve(__dirname, '../../src/screens'),
  path.resolve(__dirname, '../../src/components'),
];

function getAllTsxFiles(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...getAllTsxFiles(full));
    } else if (entry.name.endsWith('.tsx')) {
      results.push(full);
    }
  }
  return results;
}

interface Finding {
  file: string;
  line: number;
  type: 'FlatList' | 'map';
}

const EMPTY_PATTERNS = [
  /ListEmptyComponent/,
  /\.length\s*===?\s*0/,
  /\.length\s*[<>]/,
  /emptyComponent/i,
  /empty.*state/i,
  /no.*results/i,
  /no.*data/i,
  /no.*items/i,
  /no.*workouts/i,
  /no.*clubs/i,
  /no.*events/i,
  /nothing.*to.*show/i,
];

const findings: Finding[] = [];
const root = path.resolve(__dirname, '../..');

console.log('=== Empty State Coverage Audit ===\n');

for (const dir of SCAN_DIRS) {
  for (const file of getAllTsxFiles(dir)) {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');

    // Check FlatList usage
    for (let i = 0; i < lines.length; i++) {
      if (/<FlatList/.test(lines[i]) || /FlatList\s/.test(lines[i])) {
        // Look for ListEmptyComponent within ~30 lines or as a prop
        const surroundingBlock = lines.slice(i, Math.min(i + 30, lines.length)).join('\n');
        const hasEmpty = /ListEmptyComponent/.test(surroundingBlock);
        if (!hasEmpty) {
          findings.push({ file, line: i + 1, type: 'FlatList' });
        }
      }
    }

    // Check .map() on arrays rendered in JSX
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Match patterns like {items.map( or {data.map(
      if (/\{\s*\w+\.map\s*\(/.test(line)) {
        // Look in surrounding 10 lines for empty check
        const surrounding = lines.slice(Math.max(0, i - 5), Math.min(i + 10, lines.length)).join('\n');
        const hasEmptyCheck = EMPTY_PATTERNS.some((p) => p.test(surrounding));
        if (!hasEmptyCheck) {
          findings.push({ file, line: i + 1, type: 'map' });
        }
      }
    }
  }
}

// Print findings grouped by file
const byFile = new Map<string, Finding[]>();
for (const f of findings) {
  const rel = path.relative(root, f.file);
  if (!byFile.has(rel)) byFile.set(rel, []);
  byFile.get(rel)!.push(f);
}

for (const [file, items] of byFile) {
  for (const item of items) {
    console.log(`FLAG: ${file}:${item.line} -- ${item.type} without empty state`);
  }
}

console.log(`\n--- Summary ---`);
console.log(`Lists without empty state: ${findings.length}`);
console.log(`Files affected: ${byFile.size}`);
console.log(`  FlatList: ${findings.filter((f) => f.type === 'FlatList').length}`);
console.log(`  .map():   ${findings.filter((f) => f.type === 'map').length}`);

process.exit(0);
