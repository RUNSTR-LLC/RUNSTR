/**
 * Audit: TouchableOpacity activeOpacity Props
 * Scans all .tsx files for <TouchableOpacity without activeOpacity prop.
 * Inconsistent press feedback is a common UX issue.
 */

import * as fs from 'fs';
import * as path from 'path';

const SRC_DIR = path.resolve(__dirname, '../../src');
const root = path.resolve(__dirname, '../..');

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

interface FileStat {
  file: string;
  total: number;
  missing: number;
  lines: number[];
}

const stats: FileStat[] = [];
let totalAll = 0;
let missingAll = 0;

console.log('=== TouchableOpacity activeOpacity Audit ===\n');

for (const file of getAllTsxFiles(SRC_DIR)) {
  const content = fs.readFileSync(file, 'utf-8');

  // Skip files that don't use TouchableOpacity
  if (!content.includes('TouchableOpacity')) continue;

  const lines = content.split('\n');
  let fileTotal = 0;
  let fileMissing = 0;
  const missingLines: number[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (/<TouchableOpacity/.test(lines[i])) {
      fileTotal++;

      // Collect the full opening tag (may span multiple lines)
      let tagContent = '';
      for (let j = i; j < Math.min(i + 10, lines.length); j++) {
        tagContent += lines[j] + '\n';
        if (/>/.test(lines[j])) break;
      }

      if (!/activeOpacity/.test(tagContent)) {
        fileMissing++;
        missingLines.push(i + 1);
      }
    }
  }

  if (fileTotal > 0) {
    totalAll += fileTotal;
    missingAll += fileMissing;

    if (fileMissing > 0) {
      stats.push({
        file: path.relative(root, file),
        total: fileTotal,
        missing: fileMissing,
        lines: missingLines,
      });
    }
  }
}

// Sort by most missing first
stats.sort((a, b) => b.missing - a.missing);

for (const s of stats) {
  console.log(`FLAG: ${s.file} -- ${s.missing}/${s.total} missing activeOpacity (lines: ${s.lines.join(', ')})`);
}

console.log(`\n--- Summary ---`);
console.log(`Total <TouchableOpacity> instances: ${totalAll}`);
console.log(`Missing activeOpacity: ${missingAll}`);
console.log(`Files with missing props: ${stats.length}`);
console.log(`Coverage: ${totalAll > 0 ? Math.round(((totalAll - missingAll) / totalAll) * 100) : 100}%`);

process.exit(0);
