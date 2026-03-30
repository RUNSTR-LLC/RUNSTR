/**
 * Audit: File size limit
 * Scans all .ts and .tsx files in src/ for files exceeding the 500-line limit.
 * Per CLAUDE.md: "500-line file limit — Split files that exceed this"
 */

import * as fs from 'fs';
import * as path from 'path';

const SRC_DIR = path.resolve(__dirname, '../../src');
const LINE_LIMIT = 500;

interface Finding {
  file: string;
  lines: number;
  suggestedSplitPoint: string;
}

function walkDir(dir: string, ext: string[]): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(fullPath, ext));
    } else if (ext.some(e => entry.name.endsWith(e))) {
      results.push(fullPath);
    }
  }
  return results;
}

function suggestSplitPoint(filePath: string, content: string): string {
  const lines = content.split('\n');
  const mid = Math.floor(lines.length / 2);

  // Look for a good split point near the middle: export, class, or large function
  for (let i = mid; i < Math.min(mid + 100, lines.length); i++) {
    const line = lines[i];
    if (/^export\s+(function|const|class|interface|type)\s/.test(line)) {
      return `line ${i + 1}: ${line.trim().slice(0, 80)}`;
    }
  }
  for (let i = mid; i > Math.max(mid - 100, 0); i--) {
    const line = lines[i];
    if (/^export\s+(function|const|class|interface|type)\s/.test(line)) {
      return `line ${i + 1}: ${line.trim().slice(0, 80)}`;
    }
  }

  return `line ${mid + 1} (no obvious export boundary found)`;
}

console.log('=== Audit: File Size Limit (500 lines) ===\n');

const files = walkDir(SRC_DIR, ['.ts', '.tsx']);
const findings: Finding[] = [];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf-8');
  const lineCount = content.split('\n').length;

  if (lineCount > LINE_LIMIT) {
    findings.push({
      file: path.relative(path.resolve(__dirname, '../..'), file),
      lines: lineCount,
      suggestedSplitPoint: suggestSplitPoint(file, content),
    });
  }
}

findings.sort((a, b) => b.lines - a.lines);

for (const f of findings) {
  console.log(`[OVER] ${f.file} (${f.lines} lines)`);
  console.log(`       Split near: ${f.suggestedSplitPoint}`);
}

console.log(`\n=== Summary: ${findings.length} file(s) over ${LINE_LIMIT} lines ===`);
process.exit(0);
