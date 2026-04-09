/**
 * Audit: Check that async methods in src/services/ have error handling (try/catch or .catch).
 * Flags async methods with no error handling.
 */

import * as fs from 'fs';
import * as path from 'path';

const SERVICES_DIR = path.resolve(__dirname, '../../src/services');

function getAllFiles(dir: string, ext: string[] = ['.ts', '.tsx']): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...getAllFiles(full, ext));
    } else if (ext.some(e => entry.name.endsWith(e))) {
      results.push(full);
    }
  }
  return results;
}

interface AsyncMethod {
  file: string;
  line: number;
  name: string;
  hasErrorHandling: boolean;
}

/**
 * Extract async methods/functions and check if their body contains try/catch or .catch().
 * Uses a brace-counting approach to find the method body.
 */
function analyzeFile(filepath: string): AsyncMethod[] {
  const content = fs.readFileSync(filepath, 'utf-8');
  const lines = content.split('\n');
  const methods: AsyncMethod[] = [];
  const rel = path.relative(path.resolve(__dirname, '../..'), filepath);

  // Match async function/method declarations
  const asyncPattern = /\basync\s+(?:function\s+)?(\w+)\s*\(/;
  const asyncArrowPattern = /(?:const|let|var)\s+(\w+)\s*=\s*async\s*(?:\([^)]*\)|[^=]*)=>/;
  const asyncMethodPattern = /\basync\s+(\w+)\s*\(/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let match = asyncPattern.exec(line) || asyncArrowPattern.exec(line) || asyncMethodPattern.exec(line);

    if (!match) continue;

    const methodName = match[1];
    // Skip common non-method matches
    if (['if', 'for', 'while', 'switch', 'import'].includes(methodName)) continue;

    // Find the opening brace
    let braceStart = -1;
    let searchLine = i;
    while (searchLine < lines.length && searchLine < i + 5) {
      const idx = lines[searchLine].indexOf('{');
      if (idx !== -1) {
        braceStart = searchLine;
        break;
      }
      // Arrow functions without braces — skip (single expression, usually safe)
      if (lines[searchLine].includes('=>') && !lines[searchLine].includes('{')) {
        braceStart = -1;
        break;
      }
      searchLine++;
    }

    if (braceStart === -1) continue;

    // Count braces to find the end of the method body
    let depth = 0;
    let bodyLines: string[] = [];
    let foundEnd = false;
    for (let j = braceStart; j < lines.length; j++) {
      const l = lines[j];
      for (const ch of l) {
        if (ch === '{') depth++;
        if (ch === '}') depth--;
      }
      bodyLines.push(l);
      if (depth === 0 && j > braceStart) {
        foundEnd = true;
        break;
      }
      // Safety: don't scan more than 200 lines
      if (j - braceStart > 200) break;
    }

    if (!foundEnd) continue;

    const body = bodyLines.join('\n');
    const hasTryCatch = /\btry\s*\{/.test(body);
    const hasDotCatch = /\.catch\s*\(/.test(body);
    const hasErrorHandling = hasTryCatch || hasDotCatch;

    methods.push({
      file: rel,
      line: i + 1,
      name: methodName,
      hasErrorHandling,
    });
  }

  return methods;
}

console.log('=== Service Error Handling Audit ===\n');

const files = getAllFiles(SERVICES_DIR);
const allMethods: AsyncMethod[] = [];

for (const file of files) {
  allMethods.push(...analyzeFile(file));
}

const unhandled = allMethods.filter(m => !m.hasErrorHandling);

if (unhandled.length === 0) {
  console.log('All async methods have error handling.\n');
} else {
  console.log(`Async methods without try/catch or .catch():\n`);
  for (const m of unhandled) {
    console.log(`  [WARN] ${m.name} — ${m.file}:${m.line}`);
  }
  console.log('');
}

console.log(`=== Summary: ${allMethods.length} async methods scanned, ${unhandled.length} without error handling ===`);
process.exit(0);
