/**
 * Audit: Dead imports
 * Scans all .ts and .tsx files in src/ for imported symbols that are
 * never referenced elsewhere in the file.
 */

import * as fs from 'fs';
import * as path from 'path';

const SRC_DIR = path.resolve(__dirname, '../../src');
const ROOT = path.resolve(__dirname, '../..');
const MAX_FINDINGS = 50;

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

interface Finding {
  file: string;
  line: number;
  symbol: string;
}

/**
 * Extract named imports from an import statement.
 * Handles: import { A, B, C } from '...'
 *          import { A as B } from '...'
 *          import type { A } from '...'
 */
function extractNamedImports(importLine: string): string[] {
  const match = importLine.match(/\{([^}]+)\}/);
  if (!match) return [];

  return match[1].split(',').map(s => {
    const trimmed = s.trim();
    // Handle "X as Y" — the local name is Y
    const asMatch = trimmed.match(/\S+\s+as\s+(\S+)/);
    return asMatch ? asMatch[1] : trimmed;
  }).filter(s => s.length > 0);
}

/**
 * Extract default import from an import statement.
 * Handles: import Foo from '...'
 *          import Foo, { Bar } from '...'
 */
function extractDefaultImport(importLine: string): string | null {
  // Skip: import type, import { }, import '...' (side-effect)
  const match = importLine.match(/^import\s+(?:type\s+)?([A-Za-z_$][\w$]*)\s*[,{from]/);
  if (match && match[1] !== 'type') return match[1];
  return null;
}

console.log('=== Audit: Dead Imports ===\n');

const files = walkDir(SRC_DIR, ['.ts', '.tsx']);
const findings: Finding[] = [];

for (const file of files) {
  if (findings.length >= MAX_FINDINGS) break;

  const content = fs.readFileSync(file, 'utf-8');
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    if (findings.length >= MAX_FINDINGS) break;

    const line = lines[i];

    // Only process import lines
    if (!/^import\s/.test(line.trim())) continue;
    // Skip side-effect imports: import '...' or import "..."
    if (/^import\s+['"]/.test(line.trim())) continue;
    // Skip multi-line imports that are continuations
    if (/^\s+/.test(line) && i > 0 && /^import\s/.test(lines[i-1]?.trim())) continue;

    // Handle multi-line imports: join lines until we find 'from'
    let fullImport = line;
    let j = i;
    while (!/from\s+['"]/.test(fullImport) && j < Math.min(i + 5, lines.length - 1)) {
      j++;
      fullImport += ' ' + lines[j].trim();
    }

    // Get the rest of the file (everything after the import block)
    const restOfFile = lines.slice(j + 1).join('\n');

    // Check named imports
    const namedImports = extractNamedImports(fullImport);
    for (const symbol of namedImports) {
      if (findings.length >= MAX_FINDINGS) break;
      // Check if symbol appears in rest of file as a word boundary
      const regex = new RegExp(`\\b${symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
      if (!regex.test(restOfFile)) {
        findings.push({
          file: path.relative(ROOT, file),
          line: i + 1,
          symbol,
        });
      }
    }

    // Check default import
    const defaultImport = extractDefaultImport(fullImport);
    if (defaultImport && findings.length < MAX_FINDINGS) {
      const regex = new RegExp(`\\b${defaultImport.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
      if (!regex.test(restOfFile)) {
        findings.push({
          file: path.relative(ROOT, file),
          line: i + 1,
          symbol: defaultImport,
        });
      }
    }
  }
}

for (const f of findings) {
  console.log(`[UNUSED] ${f.file}:${f.line} — ${f.symbol}`);
}

if (findings.length >= MAX_FINDINGS) {
  console.log(`\n(output capped at ${MAX_FINDINGS} findings)`);
}

console.log(`\n=== Summary: ${findings.length} unused import(s) found ===`);
process.exit(0);
