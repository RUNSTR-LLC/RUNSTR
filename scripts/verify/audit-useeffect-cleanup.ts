/**
 * Audit: useEffect cleanup
 * Scans .tsx files in src/screens/ and src/components/ for useEffect hooks
 * that contain async operations but lack cleanup returns.
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');
const SCAN_DIRS = [
  path.resolve(ROOT, 'src/screens'),
  path.resolve(ROOT, 'src/components'),
];

function walkDir(dir: string, ext: string[]): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
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

// Patterns that indicate async/side-effect work needing cleanup
const ASYNC_PATTERNS = [
  /\bawait\b/,
  /\.then\s*\(/,
  /\.subscribe\s*\(/,
  /addEventListener\s*\(/,
  /setInterval\s*\(/,
  /setTimeout\s*\(/,
];

// Patterns that indicate a cleanup return
const CLEANUP_PATTERNS = [
  /return\s*\(\s*\)\s*=>/,
  /return\s+\(\s*\)\s*=>/,
  /return\s+unsubscribe/,
  /return\s+cleanup/,
  /return\s+sub/,
  /return\s+\(\)\s*\{/,
  /return\s+function/,
];

interface Finding {
  file: string;
  line: number;
  triggers: string[];
}

const findings: Finding[] = [];

console.log('=== Audit: useEffect Cleanup ===\n');

for (const dir of SCAN_DIRS) {
  const files = walkDir(dir, ['.tsx']);

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      // Find useEffect calls
      if (!/useEffect\s*\(/.test(lines[i])) continue;

      // Extract the useEffect body by tracking braces
      let braceDepth = 0;
      let started = false;
      let body = '';
      let effectStart = i;

      for (let j = i; j < lines.length; j++) {
        const line = lines[j];
        for (const ch of line) {
          if (ch === '{') {
            braceDepth++;
            started = true;
          }
          if (ch === '}') braceDepth--;
        }
        body += line + '\n';
        if (started && braceDepth <= 0) break;
      }

      // Check which async patterns are present
      const matchedPatterns: string[] = [];
      for (const pattern of ASYNC_PATTERNS) {
        if (pattern.test(body)) {
          matchedPatterns.push(pattern.source.replace(/\\b/g, '').replace(/\\s\*\\\(/g, '('));
        }
      }

      if (matchedPatterns.length === 0) continue;

      // Check if cleanup return exists
      const hasCleanup = CLEANUP_PATTERNS.some(p => p.test(body));

      if (!hasCleanup) {
        findings.push({
          file: path.relative(ROOT, file),
          line: effectStart + 1,
          triggers: matchedPatterns,
        });
      }
    }
  }
}

for (const f of findings) {
  console.log(`[MISSING] ${f.file}:${f.line}`);
  console.log(`          Triggers: ${f.triggers.join(', ')}`);
}

console.log(`\n=== Summary: ${findings.length} useEffect(s) with async work but no cleanup ===`);
process.exit(0);
